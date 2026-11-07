-- 038_listing_currency.sql
--
-- Currency choice (MXN/USD) + Gratis as its own state.
--
-- Adds listings.currency so a price keeps its meaning: a $8,000 USD
-- car must not display as $8,000 MXN. MXN is the default — existing
-- rows were all entered as pesos, so they become MXN by definition.
-- Adds listings.is_free so a free item ("Gratis") is distinct from a
-- consult-price item ("Consultar precio"); before this both were the
-- same $0 checkbox.
--
-- Safe to run once (IF NOT EXISTS). The app degrades gracefully until
-- this is applied: the new/edit forms retry the write without the new
-- columns on 42703, and every display site treats a missing currency
-- as MXN.
--
-- Run in the Supabase SQL editor.

alter table public.listings
  add column if not exists currency text not null default 'MXN'
  check (currency in ('MXN', 'USD'));

alter table public.listings
  add column if not exists is_free boolean not null default false;

notify pgrst, 'reload schema';
