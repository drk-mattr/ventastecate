-- ============================================================
-- Drop the legacy listings columns from the old schema lineage.
--
-- After 014 added user_id (also FK -> profiles), the table had TWO foreign keys
-- to profiles (seller_id + user_id). PostgREST then can't resolve the
-- `profile:profiles(...)` embed on the listing detail page, errors, and the page
-- 404s. Removing the now-unused legacy columns leaves a single profiles
-- relationship (user_id) and cleans up the remaining schema drift.
--
-- Safe: 014 already repointed all RLS policies to user_id; the search_vector /
-- updated_at triggers don't reference these columns; data is disposable.
-- ============================================================

alter table public.listings drop column if exists seller_id;
alter table public.listings drop column if exists category_id;
alter table public.listings drop column if exists currency;
alter table public.listings drop column if exists condition;

notify pgrst, 'reload schema';
