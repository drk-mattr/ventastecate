-- 040_stories.sql
--
-- Stories (images-first, v1): ephemeral 24h image posts — circles at
-- the top of the homepage, the WhatsApp/Instagram pattern. A story is
-- an image + an optional link to a listing or a business. No video in
-- v1. Feed = archive, stories = pulse: the lowest-stakes way to
-- participate (just a photo, no title/price/category).
--
-- The user runs this in the Supabase SQL editor. The app degrades
-- gracefully until it is applied: the homepage stories query fails
-- closed (rail hidden, page still 200) and the story routes answer
-- 503 when the table is missing.
--
-- Safe to run once (IF NOT EXISTS).

create table if not exists public.stories (
  id uuid default gen_random_uuid() primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  listing_id uuid references public.listings(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  created_at timestamptz default now() not null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (expires_at > created_at)
);

create index if not exists stories_active_idx
  on public.stories (created_at desc);

-- Story reports ride the existing reports inbox: a story report never
-- auto-hides the story (same rule as items — a single report opens a
-- review, it does not remove content).
alter table public.reports
  add column if not exists story_id uuid references public.stories(id) on delete set null;

create index if not exists reports_story_idx
  on public.reports (story_id);

alter table public.stories enable row level security;

-- Anyone (anon + signed-in) can read stories that have not expired yet.
drop policy if exists "public read active stories" on public.stories;
create policy "public read active stories" on public.stories
  for select using (expires_at > now());

-- A signed-in user can post a story only as themselves.
drop policy if exists "authenticated insert own story" on public.stories;
create policy "authenticated insert own story" on public.stories
  for insert with check (auth.uid() = author_id);

-- The author can delete their own story.
drop policy if exists "owner delete own story" on public.stories;
create policy "owner delete own story" on public.stories
  for delete using (auth.uid() = author_id);

notify pgrst, 'reload schema';
