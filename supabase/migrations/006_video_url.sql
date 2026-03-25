-- Add video_url field to listings for embedded video support
-- Supports YouTube, Facebook, TikTok URLs — rendered as inline players
alter table public.listings
  add column video_url text;
