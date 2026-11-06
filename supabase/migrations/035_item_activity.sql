-- ============================================================
-- Items indexing engine, stage 034D — Activity (brief v1.1 §7.1,
-- §7.3, §11.3, §12).
--
-- activity_score: the v1 Alive-family score for items, computed in
-- PostgreSQL (the brief's hardening rule: aggregation in the
-- database, render in the server component). It reads ONLY
-- listing_item_tags + listings (+ items/businesses for the joins)
-- — never item_feedback (does not exist) and never items.origin.
-- No recommendation_score is computed or displayed anywhere.
--
-- Formula (§7.1), per ACTIVE listing mentioning the offering in
-- the last 30 days:
--   (1 + likes*1 + saves*2.5 + comments*1.5) / (hours_age + 2)^1.2
-- Conversations do NOT enter (an offering is not sold by message;
-- they still count for the business). No <1h boost (the brief's
-- formula has none — the listing ranking_score's boost is not
-- part of the item formula).
--
-- Engagement lives in per-action tables in prod
-- (listing_likes / listing_saves / listing_comments), NOT in
-- counter columns on listings (migration 005 declared counters
-- that prod's lineage never got — listings.likes_count does not
-- exist). Likes/saves are unique per (listing, user), so count(*)
-- is the distinct-user count; comments count every comment.
--
-- Anti-manipulation (§7.4, §13-10):
--   - mentions by the claimed owner of the business never score
--     their own offerings (l.user_id is distinct from
--     businesses.claimed_by);
--   - per-author cap: at most 3 mentions per author per offering
--     in the window count, best contributions first;
--   - secondary tags weigh 0.5x the listing's contribution (the
--     brief says secondaries do not get the full weight; 0.5 is
--     the chosen factor, recorded here so it can be calibrated).
--
-- Gates live in lib/items/activity.ts (thresholds per §11.3); the
-- functions below only return the scored rows and the scope
-- aggregates the gate reads.
--
-- SECURITY DEFINER: the functions bypass RLS and enforce the
-- visibility rules themselves (active listings, visible items).
-- They return aggregates only — no raw rows, no user data beyond
-- distinct-author counts.
--
-- Guarded/idempotent style (prod lineage differs from schema.sql):
-- CREATE OR REPLACE, explicit grants, ends with
-- `notify pgrst, 'reload schema'`. Run in the Supabase SQL editor.
-- Until this migration is applied, the type page degrades
-- gracefully: the RPC call fails, the helper reports the activity
-- as unavailable, and the page renders its 034C unranked state
-- (no trending section, no rank numbers, no crash).
-- ============================================================

-- ---------- per-offering activity (§7.1) ----------
create or replace function public.item_activity(
  p_kind_ids uuid[],
  p_towns text[] default null,
  p_days integer default 30
)
returns table (
  item_id uuid,
  business_id uuid,
  kind_id uuid,
  town text,
  score double precision,
  mentions integer,
  contributors integer,
  latest_mention_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with like_counts as (
    select listing_id, count(*) as n
    from public.listing_likes
    group by listing_id
  ),
  save_counts as (
    select listing_id, count(*) as n
    from public.listing_saves
    group by listing_id
  ),
  comment_counts as (
    select listing_id, count(*) as n
    from public.listing_comments
    group by listing_id
  ),
  scored as (
    select
      t.item_id,
      l.id as listing_id,
      l.user_id as author_id,
      l.created_at,
      case when t.is_primary then 1.0 else 0.5 end
        * (1 + coalesce(lc.n, 0) * 1.0 + coalesce(sc.n, 0) * 2.5 + coalesce(cc.n, 0) * 1.5)
        / power(greatest(extract(epoch from (now() - l.created_at)) / 3600.0, 0) + 2, 1.2)
        as contribution,
      row_number() over (
        partition by t.item_id, l.user_id
        order by
          case when t.is_primary then 1.0 else 0.5 end
            * (1 + coalesce(lc.n, 0) * 1.0 + coalesce(sc.n, 0) * 2.5 + coalesce(cc.n, 0) * 1.5)
            / power(greatest(extract(epoch from (now() - l.created_at)) / 3600.0, 0) + 2, 1.2) desc,
          l.created_at desc
      ) as author_rank
    from public.listing_item_tags t
    join public.listings l on l.id = t.listing_id
    join public.items i on i.id = t.item_id
    join public.businesses b on b.id = i.business_id
    left join like_counts lc on lc.listing_id = l.id
    left join save_counts sc on sc.listing_id = l.id
    left join comment_counts cc on cc.listing_id = l.id
    where l.status = 'active'
      and i.status = 'visible'
      and i.kind_id = any(p_kind_ids)
      and l.created_at >= now() - make_interval(days => p_days)
      and (p_towns is null
           or b.city = any(p_towns)
           or (b.city is null and b.location = any(p_towns)))
      and (b.claimed_by is null or l.user_id is distinct from b.claimed_by)
  )
  select
    s.item_id,
    i.business_id,
    i.kind_id,
    coalesce(b.city, b.location) as town,
    coalesce(sum(s.contribution), 0)::double precision as score,
    count(*)::integer as mentions,
    count(distinct s.author_id)::integer as contributors,
    max(s.created_at) as latest_mention_at
  from scored s
  join public.items i on i.id = s.item_id
  join public.businesses b on b.id = i.business_id
  where s.author_rank <= 3
  group by s.item_id, i.business_id, i.kind_id, coalesce(b.city, b.location)
  order by score desc;
$$;

-- ---------- scope aggregates for the confidence gate (§11.3) ----------
-- One row: how many offerings score > 0 in scope, how many towns
-- they span, and how many distinct users mentioned anything in
-- scope (uncapped — a user counts as a voice even when their 4th
-- post adds no more score). The gate itself lives in
-- lib/items/activity.ts.
create or replace function public.item_activity_scope(
  p_kind_ids uuid[],
  p_towns text[] default null,
  p_days integer default 30
)
returns table (
  scoring_items integer,
  towns integer,
  distinct_users integer
)
language sql
stable
security definer
set search_path = public
as $$
  with a as (
    select * from public.item_activity(p_kind_ids, p_towns, p_days)
  )
  select
    (select count(*)::integer from a),
    (select count(distinct town)::integer from a),
    (select count(distinct l.user_id)::integer
     from public.listing_item_tags t
     join public.listings l on l.id = t.listing_id
     join public.items i on i.id = t.item_id
     join public.businesses b on b.id = i.business_id
     where l.status = 'active'
       and i.status = 'visible'
       and i.kind_id = any(p_kind_ids)
       and l.created_at >= now() - make_interval(days => p_days)
       and (p_towns is null
            or b.city = any(p_towns)
            or (b.city is null and b.location = any(p_towns)))
       and (b.claimed_by is null or l.user_id is distinct from b.claimed_by));
$$;

grant execute on function public.item_activity(uuid[], text[], integer)
  to anon, authenticated, service_role;
grant execute on function public.item_activity_scope(uuid[], text[], integer)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
