-- ============================================================
-- Ranking Algorithm for Ventas Tecate
-- ============================================================
--
-- FORMULA (inspired by Reddit/HackerNews "hot" ranking):
--
--   score = engagement_score / (hours_since_posted + 2) ^ decay
--
-- Where:
--   engagement_score = (likes * 1) + (saves * 2.5) + (comments * 1.5) + (conversations * 4)
--   decay = 1.2 (medium — content peaks ~24h, fades over 2-3 days)
--
-- Weight reasoning:
--   - likes (1.0):     Lowest effort, most common. Baseline signal.
--   - comments (1.5):  More effort than a like. Shows discussion/interest.
--   - saves (2.5):     High intent — user wants to come back to this.
--   - conversations (4.0): Highest intent — someone wants to buy/connect.
--
-- The "+2" in the denominator prevents division-by-zero and gives
-- brand-new posts (0 hours old) a small head start without infinite score.
--
-- A fresh post with 0 engagement gets score ~0.
-- A 1-hour-old post with 3 likes gets: 3 / (3)^1.2 ≈ 0.83
-- A 24-hour-old post with 10 likes gets: 10 / (26)^1.2 ≈ 0.22
-- A 3-day-old post with 50 likes gets: 50 / (74)^1.2 ≈ 0.30 (still surfaces!)
-- ============================================================

-- 1. Add conversation_count to listings for ranking
alter table public.listings
  add column if not exists conversation_count integer not null default 0;

-- 2. Add ranking_score column (recomputed on engagement changes)
alter table public.listings
  add column if not exists ranking_score double precision not null default 0;

-- 3. Index for fast ordering by ranking_score
create index if not exists listings_ranking_score_idx
  on public.listings(ranking_score desc, created_at desc);

-- Also a compound index for filtered + ranked queries
create index if not exists listings_status_ranking_idx
  on public.listings(status, ranking_score desc);

-- ============================================================
-- Core ranking function: computes score for a single listing
-- ============================================================
create or replace function public.compute_ranking_score(
  p_likes integer,
  p_saves integer,
  p_comments integer,
  p_conversations integer,
  p_created_at timestamptz
)
returns double precision as $$
declare
  engagement double precision;
  hours_age double precision;
  decay_factor double precision := 1.2;
  score double precision;
begin
  -- Weighted engagement
  engagement := (p_likes * 1.0) + (p_saves * 2.5) + (p_comments * 1.5) + (p_conversations * 4.0);

  -- Hours since posted (minimum 0)
  hours_age := greatest(extract(epoch from (now() - p_created_at)) / 3600.0, 0);

  -- Score with time decay
  -- Adding 2 to denominator prevents div-by-zero and gives new posts a baseline
  score := engagement / power(hours_age + 2, decay_factor);

  -- Boost: brand new posts (<1h) with any engagement get a small multiplier
  -- This prevents the "cold start" problem where new posts can never compete
  if hours_age < 1 and engagement > 0 then
    score := score * 1.5;
  end if;

  return score;
end;
$$ language plpgsql immutable;

-- ============================================================
-- Function to recompute ranking_score for a specific listing
-- ============================================================
create or replace function public.refresh_listing_ranking(p_listing_id uuid)
returns void as $$
begin
  update public.listings
  set ranking_score = public.compute_ranking_score(
    likes_count,
    saves_count,
    comments_count,
    conversation_count,
    created_at
  )
  where id = p_listing_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Function to recompute ALL rankings (for periodic refresh)
-- ============================================================
create or replace function public.refresh_all_rankings()
returns void as $$
begin
  update public.listings
  set ranking_score = public.compute_ranking_score(
    likes_count,
    saves_count,
    comments_count,
    conversation_count,
    created_at
  )
  where status = 'active';
end;
$$ language plpgsql security definer;

-- ============================================================
-- Triggers: recompute ranking on engagement changes
-- ============================================================

-- After likes change → recompute
create or replace function public.trigger_ranking_on_like()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    perform public.refresh_listing_ranking(NEW.listing_id);
    return NEW;
  elsif (TG_OP = 'DELETE') then
    perform public.refresh_listing_ranking(OLD.listing_id);
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_like_ranking
  after insert or delete on public.listing_likes
  for each row execute procedure public.trigger_ranking_on_like();

-- After saves change → recompute
create or replace function public.trigger_ranking_on_save()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    perform public.refresh_listing_ranking(NEW.listing_id);
    return NEW;
  elsif (TG_OP = 'DELETE') then
    perform public.refresh_listing_ranking(OLD.listing_id);
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_save_ranking
  after insert or delete on public.listing_saves
  for each row execute procedure public.trigger_ranking_on_save();

-- After comment added → recompute (also update comments_count)
create or replace function public.trigger_ranking_on_comment()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.listings
    set comments_count = comments_count + 1
    where id = NEW.listing_id;
    perform public.refresh_listing_ranking(NEW.listing_id);
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.listings
    set comments_count = greatest(comments_count - 1, 0)
    where id = OLD.listing_id;
    perform public.refresh_listing_ranking(OLD.listing_id);
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Only create if listing_comments table exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'listing_comments') then
    execute 'create trigger on_comment_ranking
      after insert or delete on public.listing_comments
      for each row execute procedure public.trigger_ranking_on_comment()';
  end if;
end $$;

-- After conversation created → update count and recompute
create or replace function public.trigger_ranking_on_conversation()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.listings
    set conversation_count = conversation_count + 1
    where id = NEW.listing_id;
    perform public.refresh_listing_ranking(NEW.listing_id);
    return NEW;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_conversation_ranking
  after insert on public.conversations
  for each row execute procedure public.trigger_ranking_on_conversation();

-- ============================================================
-- Backfill: compute conversation_count for existing listings
-- ============================================================
update public.listings l
set conversation_count = (
  select count(*) from public.conversations c where c.listing_id = l.id
);

-- ============================================================
-- Backfill: compute initial ranking_score for all active listings
-- ============================================================
select public.refresh_all_rankings();
