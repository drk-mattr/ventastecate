-- 037_ranking_functions_restore.sql
--
-- Restore the ranking functions that migration 007 was supposed to
-- create but never made it onto the current prod DB.
--
-- ROOT CAUSE (2026-11-06, user's first real message send failed with
-- "No se pudo enviar el mensaje"): migration 028's
-- on_first_message_ranking trigger on public.messages calls
-- public.refresh_listing_ranking(), which DOES NOT EXIST in prod
-- (PGRST202). The trigger errors, the whole message INSERT rolls back.
-- 007's columns (ranking_score, conversation_count) exist, but its
-- three functions (compute_ranking_score, refresh_listing_ranking,
-- refresh_all_rankings) are all missing — same early-migration lineage
-- gap as the missing conversation FKs.
--
-- CORRECTION vs 007: 007's function bodies read likes_count /
-- saves_count / comments_count columns, which do NOT exist in prod
-- (400). Engagement lives in the per-action tables listing_likes /
-- listing_saves / listing_comments. This migration counts rows from
-- those tables instead. "Just run 007" would fail on first call
-- with 42703.
--
-- SIDE EFFECT FIXED: ranking is silently dead in prod — no
-- like/save/comment/conversation ever updates ranking_score, so the
-- trending bar can never appear even with engagement. The triggers
-- below (like/save/comment) plus 028's first-message triggers
-- re-arm it.
--
-- NOTES:
-- - compute_ranking_score keeps 007's formula verbatim, but is
--   declared STABLE (not IMMUTABLE — it reads now()).
-- - 007's comment trigger incremented/decremented a comments_count
--   column that does not exist; the version here only recomputes.
-- - 028 deliberately retired 007's on_conversation_ranking trigger
--   (empty threads must not count) in favor of the first-message
--   triggers. It is NOT recreated here; the drops below are
--   belt-and-braces for any DB where 028's drops did not run.
-- - Safe to run more than once (IF NOT EXISTS / CREATE OR REPLACE /
--   DROP TRIGGER IF EXISTS). Run in the Supabase SQL editor.
--   The message send only works AFTER this is applied.

-- ============================================================
-- Columns + indexes (007's — harmless if already present)
-- ============================================================
alter table public.listings
  add column if not exists conversation_count integer not null default 0;

alter table public.listings
  add column if not exists ranking_score double precision not null default 0;

create index if not exists listings_ranking_score_idx
  on public.listings(ranking_score desc, created_at desc);

create index if not exists listings_status_ranking_idx
  on public.listings(status, ranking_score desc);

-- ============================================================
-- Core ranking function: computes score for a single listing
-- (007's formula verbatim)
--
--   score = engagement / (hours_age + 2) ^ 1.2
--   engagement = likes*1 + saves*2.5 + comments*1.5 + conversations*4
--   <1h-old posts with engagement get a x1.5 boost
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
$$ language plpgsql stable;

-- ============================================================
-- Function to recompute ranking_score for a specific listing
-- CORRECTED vs 007: counts rows from the per-action tables
-- (listing_likes / listing_saves / listing_comments) instead of
-- reading likes_count / saves_count / comments_count columns
-- that do not exist in prod.
-- ============================================================
create or replace function public.refresh_listing_ranking(p_listing_id uuid)
returns void as $$
begin
  update public.listings l
  set ranking_score = public.compute_ranking_score(
    (select count(*)::integer from public.listing_likes where listing_id = p_listing_id),
    (select count(*)::integer from public.listing_saves where listing_id = p_listing_id),
    (select count(*)::integer from public.listing_comments where listing_id = p_listing_id),
    l.conversation_count,
    l.created_at
  )
  where l.id = p_listing_id;
end;
$$ language plpgsql security definer;

-- ============================================================
-- Function to recompute ALL rankings (for periodic refresh)
-- Same correction as refresh_listing_ranking.
-- ============================================================
create or replace function public.refresh_all_rankings()
returns void as $$
begin
  update public.listings l
  set ranking_score = public.compute_ranking_score(
    (select count(*)::integer from public.listing_likes where listing_id = l.id),
    (select count(*)::integer from public.listing_saves where listing_id = l.id),
    (select count(*)::integer from public.listing_comments where listing_id = l.id),
    l.conversation_count,
    l.created_at
  )
  where l.status = 'active';
end;
$$ language plpgsql security definer;

-- Expose the recompute functions to PostgREST (anon/authenticated)
-- so a live check can call /rpc/refresh_listing_ranking. Recomputing
-- from real counts cannot write arbitrary values, so this is safe.
grant execute on function public.compute_ranking_score(integer, integer, integer, integer, timestamptz) to anon, authenticated, service_role;
grant execute on function public.refresh_listing_ranking(uuid) to anon, authenticated, service_role;
grant execute on function public.refresh_all_rankings() to authenticated, service_role;

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

drop trigger if exists on_like_ranking on public.listing_likes;
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

drop trigger if exists on_save_ranking on public.listing_saves;
create trigger on_save_ranking
  after insert or delete on public.listing_saves
  for each row execute procedure public.trigger_ranking_on_save();

-- After comment added/removed → recompute
-- CORRECTED vs 007: 007 incremented/decremented a comments_count
-- column that does not exist in prod. This version only recomputes
-- the score from the per-action tables.
create or replace function public.trigger_ranking_on_comment()
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

drop trigger if exists on_comment_ranking on public.listing_comments;
create trigger on_comment_ranking
  after insert or delete on public.listing_comments
  for each row execute procedure public.trigger_ranking_on_comment();

-- 028 retired 007's conversation trigger (empty threads must not
-- count) in favor of on_first_message_ranking /
-- on_message_delete_ranking on public.messages. Do NOT recreate it.
-- Drops are belt-and-braces only.
drop trigger if exists on_conversation_ranking on public.conversations;
drop function if exists public.trigger_ranking_on_conversation();

-- ============================================================
-- Backfill: recount conversation_count from threads that actually
-- have messages (028's corrected semantics), then recompute all
-- scores from the corrected counts.
-- ============================================================
update public.listings l
set conversation_count = (
  select count(*)
  from public.conversations c
  where c.listing_id = l.id
    and exists (
      select 1 from public.messages m where m.conversation_id = c.id
    )
);

select public.refresh_all_rankings();

notify pgrst, 'reload schema';
