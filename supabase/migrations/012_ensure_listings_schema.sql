-- ============================================================
-- Reconcile the listings table with what the app reads/writes.
--
-- The production DB is out of sync with the repo's migrations (several were
-- never applied), so publishing failed column-by-column (category, city,
-- listing_type, ...). This single idempotent script ensures every column the
-- create/edit forms write actually exists, plus the listing_type CHECK that
-- allows all four types the app uses. Safe to run repeatedly: each
-- `add column if not exists` no-ops when the column is already present, and
-- NOT NULL columns backfill existing rows via their DEFAULT.
-- ============================================================

alter table public.listings add column if not exists listing_type text not null default 'product';
alter table public.listings add column if not exists category text;
alter table public.listings add column if not exists location text;
alter table public.listings add column if not exists country_code text;
alter table public.listings add column if not exists city text;
alter table public.listings add column if not exists state_region text;
alter table public.listings add column if not exists metadata jsonb;
alter table public.listings add column if not exists video_url text;
alter table public.listings add column if not exists tagged_business_id uuid references public.businesses(id) on delete set null;
alter table public.listings add column if not exists conversation_count integer not null default 0;
alter table public.listings add column if not exists ranking_score double precision not null default 0;
alter table public.listings add column if not exists status text not null default 'active';

-- listing_type allowed values: product | service | event | news
alter table public.listings drop constraint if exists listings_listing_type_check;
alter table public.listings add constraint listings_listing_type_check
  check (listing_type in ('product', 'service', 'event', 'news'));

-- Helpful indexes (idempotent)
create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_country_code_idx on public.listings (country_code);
create index if not exists listings_city_idx on public.listings (city);
create index if not exists listings_listing_type_idx on public.listings (listing_type);

notify pgrst, 'reload schema';
