-- 060: mention type + pin coordinates for the Recomendar flow
--
-- A "mention" is a fast recommendation post (photo → caption → publish):
-- no price, no title of its own (derived from the caption at publish),
-- category derived from the primary item tag. The pin is the device
-- location at post time, captured from the GPS button on the location
-- step; NULL when the user posts without it — city-only still posts.
alter table public.listings drop constraint if exists listings_listing_type_check;
alter table public.listings add constraint listings_listing_type_check
  check (listing_type in ('product', 'service', 'event', 'news', 'mention'));
alter table public.listings add column if not exists latitude double precision;
alter table public.listings add column if not exists longitude double precision;
