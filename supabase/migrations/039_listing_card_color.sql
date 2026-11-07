-- 039_listing_card_color.sql
--
-- Title-card color for photo-less news/event listings.
--
-- Adds listings.card_color so a news/event post without a photo can
-- render as a designed title card: solid background in a curated
-- color + big title text (the pattern Facebook text posts use — an
-- "ALERTA TECATE" card with no photo still travels). The poster
-- picks one of the curated colors at posting time; orange is the
-- default. The check constraint is the curated set — never a free
-- color value.
--
-- Safe to run once (IF NOT EXISTS). The app degrades gracefully until
-- this is applied: the new/edit forms retry the write without the
-- column on 42703, and every display site treats a missing color as
-- orange.
--
-- Run in the Supabase SQL editor.

alter table public.listings
  add column if not exists card_color text not null default 'orange'
  check (card_color in ('orange', 'black', 'red', 'blue', 'green', 'purple'));

notify pgrst, 'reload schema';
