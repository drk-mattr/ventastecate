-- Structured location for businesses, mirroring listings (migration 010):
-- one town (city) per shell, plus state/region and country. Region itself
-- is derived in code from the town (lib/business-regions.ts), not stored,
-- so a town can never map to two regions.
alter table public.businesses add column if not exists city text;
alter table public.businesses add column if not exists state_region text;
alter table public.businesses add column if not exists country_code text;
create index if not exists businesses_city_idx on public.businesses(city);
-- Backfill the seeded shells, all of which were seeded with location Tecate.
update public.businesses set city = 'Tecate', state_region = 'Baja California', country_code = 'MX' where location = 'Tecate' and city is null;
