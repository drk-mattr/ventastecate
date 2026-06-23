-- ============================================================
-- Add the granular location columns to listings.
--
-- The create/edit forms write country_code / city / state_region and the
-- app reads them (MVP country filtering, listing detail location, edit form),
-- but they were only ever added to the TypeScript types — never the database.
-- Publishing failed with:
--   "Could not find the 'city' column of 'listings' in the schema cache"
-- (and would next fail on country_code / state_region).
--
-- `if not exists` makes this safe to run repeatedly; the NOTIFY refreshes
-- PostgREST's schema cache so the columns are recognized immediately.
-- ============================================================

alter table public.listings
  add column if not exists country_code text,
  add column if not exists city text,
  add column if not exists state_region text;

-- country_code is filtered on every listing query (MVP locks to MX);
-- city is used for local browsing. Index the hot ones.
create index if not exists listings_country_code_idx
  on public.listings (country_code);
create index if not exists listings_city_idx
  on public.listings (city);

notify pgrst, 'reload schema';
