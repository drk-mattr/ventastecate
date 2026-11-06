-- 036_listing_sold_at.sql
--
-- Sell-through tracking for the sold loop (OfferUp lesson: manage to
-- % sold + time-to-sell, not listing count).
--
-- Adds listings.sold_at so time-to-sell can be measured. A trigger
-- stamps/clears it on every status change, so EVERY writer gets the
-- timestamp without app code — the edit form's direct client update,
-- the /api/listings/[id]/sold route, and any future writer.
--
-- Safe to run once (IF NOT EXISTS / CREATE OR REPLACE / DROP TRIGGER
-- IF EXISTS). The route and /admin/liquidity degrade gracefully until
-- this is applied: status changes still work, only the time-to-sell
-- numbers stay blank.
--
-- Run in the Supabase SQL editor.

alter table public.listings
  add column if not exists sold_at timestamptz;

create or replace function public.set_listing_sold_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'sold' and old.status is distinct from 'sold' then
    new.sold_at := now();
  elsif new.status is distinct from 'sold' then
    new.sold_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_set_sold_at on public.listings;
create trigger listings_set_sold_at
  before update of status on public.listings
  for each row execute function public.set_listing_sold_at();

notify pgrst, 'reload schema';
