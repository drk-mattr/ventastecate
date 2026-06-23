-- ============================================================
-- Add the top-level `category` column to listings.
--
-- The create/edit forms write `category`, and reads across the app
-- (listing detail badges, listing cards, edit form, category filters)
-- expect `listing.category`. It was present in the TypeScript types but
-- never added to the database, so inserts failed with:
--   "Could not find the 'category' column of 'listings' in the schema cache"
--
-- `if not exists` makes this safe to run whether or not the column is
-- already present; the NOTIFY refreshes PostgREST's schema cache so the
-- column is recognized immediately without a project restart.
-- ============================================================

alter table public.listings
  add column if not exists category text;

create index if not exists listings_category_idx
  on public.listings (category);

notify pgrst, 'reload schema';
