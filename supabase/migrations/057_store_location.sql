-- Structured location on stores (city / state / country), so a
-- store's saved location can prefill the posting form's location
-- step instead of the site region.
-- Nullable, no backfill — existing stores keep their free-text
-- location and set the structured fields on their next edit; the
-- edit form starts from the legacy free-text value in the city
-- field so nothing is lost.

alter table public.stores add column city text;
alter table public.stores add column state_region text;
alter table public.stores add column country_code text;
