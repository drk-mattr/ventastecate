-- 043_event_fields.sql
--
-- Structured event fields: an event's date/time/venue/ticket link stop
-- living only inside the free-text description, where the feed, the
-- detail page, and search could never render or sort by them. Cost is
-- already covered by price / is_free / currency (migration 038) — no
-- new cost column.
--
-- DATE-ONLY CONVENTION: the posting form has separate date and time
-- inputs; a date with no time is stored at local midnight (00:00).
-- The app treats a stored time of exactly 00:00 local as "no time was
-- set": display shows the day only, and the past check treats the
-- event as running through the end of that day.
--
-- The user runs this in the Supabase SQL editor. The app degrades
-- gracefully until it is applied: every read of these columns fails
-- soft (undefined → the card/detail render exactly as before, no
-- errors, no empty blocks), the posting form retries the insert
-- without them (same 42703 fallback as 038/039), and the
-- event-filtered search keeps newest-first order until the columns
-- exist.
--
-- Safe to run once (IF NOT EXISTS).

alter table public.listings
  add column if not exists event_starts_at timestamptz,
  add column if not exists event_ends_at timestamptz,
  add column if not exists event_venue text,
  add column if not exists event_ticket_url text;

create index if not exists listings_event_starts_idx
  on public.listings (event_starts_at);

notify pgrst, 'reload schema';
