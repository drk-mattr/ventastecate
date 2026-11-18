-- ============================================================
-- 061_restore_listing_engagement_counts.sql
--
-- WHY: every like and every save has failed since the site's
-- early days — 0 rows in listing_likes / listing_saves, ever.
-- Migration 005 created the columns likes_count / saves_count
-- on listings AND the triggers handle_likes_count /
-- handle_saves_count that maintain them. On prod the TRIGGERS
-- landed but the COLUMNS never did (035's header already notes
-- prod's lineage never got them), so each INSERT fires a
-- trigger that does `update listings set likes_count = ...`
-- against a column that does not exist. The statement errors,
-- the client sees `error` and reverts its optimistic update —
-- the heart fills for a split second (or too fast to see) and
-- un-fills. That is the whole bug: the buttons, the RLS
-- policies and the client code are all fine.
--
-- FIX: restore the two columns with the exact definition 005
-- gave them. All rows start at 0, which matches the 0 rows in
-- listing_likes / listing_saves, so no backfill is needed.
-- After this, the existing triggers maintain the counts, the
-- ranking triggers keep working (compute_ranking_score is
-- live), and notify_like can insert (notifications has all
-- four columns it writes).
-- ============================================================

alter table public.listings
  add column if not exists likes_count integer not null default 0,
  add column if not exists saves_count integer not null default 0;

notify pgrst, 'reload schema';
