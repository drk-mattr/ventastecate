-- Optional per-photo descriptions (captions) on listings.
-- The posting form lets the seller add a short description under
-- each photo (max 200 chars, enforced in the form); the detail
-- gallery renders it under the image, El Imparcial-style.
-- Nullable, no backfill — existing photos simply have no caption.

alter table public.listing_images add column caption text;
