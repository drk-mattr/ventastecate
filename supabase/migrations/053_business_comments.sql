-- 053_business_comments.sql
--
-- Business page, Comentarios (2026-11-10): the bottom section of a
-- business page stops being an opinions/rating flow and becomes a
-- plain comments thread. A star-less comment cannot live in
-- business_reviews (rating is NOT NULL 1–5, one review per user),
-- so it gets its own table, modeled on item_comments (041).
-- Business comments are for general questions/notes about the
-- business ("¿abren los domingos?"); item comments stay for talk
-- about one specific offering. This reverses the PR #127 rule
-- ("commenting happens on the item, no business-level comment
-- box") — deliberately, and limited: ratings stay display-only,
-- no score is computed from comments, a single report never hides
-- anything. The owner CAN comment (unlike reviews): the owner
-- answering a general question is the point.
--
-- The same change drops the business-level heart like (user
-- direction 2026-11-10): exactly one business like exists in the
-- whole system — Greg's own test tap on Canela — and it feeds
-- nothing (a +1 in the alive-score that can never surface the
-- section, no notification). Likes belong on items/listings.
--
-- SEQUENCING: the drops at the bottom are safe only once the new
-- code is live — the old /businesses index selects
-- businesses.likes_count explicitly, so dropping the column first
-- would render the index empty until the deploy lands. Apply the
-- additive half first (table + reports column), deploy, then run
-- this file again (every statement is idempotent) to execute the
-- drops.

create table if not exists public.business_comments (
  id uuid default gen_random_uuid() primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 1000),
  created_at timestamptz default now() not null
);

create index if not exists business_comments_business_idx
  on public.business_comments (business_id, created_at);

-- Business-comment reports ride the existing reports inbox.
alter table public.reports
  add column if not exists business_comment_id uuid references public.business_comments(id) on delete set null;

create index if not exists reports_business_comment_idx
  on public.reports (business_comment_id);

alter table public.business_comments enable row level security;

-- Anyone (anon + signed-in) can read comments.
drop policy if exists "public read business comments" on public.business_comments;
create policy "public read business comments" on public.business_comments
  for select using (true);

-- A signed-in user can comment only as themselves.
drop policy if exists "authenticated insert own business comment" on public.business_comments;
create policy "authenticated insert own business comment" on public.business_comments
  for insert with check (auth.uid() = author_id);

-- The author can delete their own comment.
drop policy if exists "owner delete own business comment" on public.business_comments;
create policy "owner delete own business comment" on public.business_comments
  for delete using (auth.uid() = author_id);

-- Drop the business-level heart like: the table, its count trigger
-- and function, and the businesses.likes_count column. Run only
-- AFTER the new code is deployed (see the sequencing note above).
drop trigger if exists on_business_like_change on public.business_likes;
drop function if exists public.handle_business_like_count();
drop table if exists public.business_likes;
alter table public.businesses drop column if exists likes_count;

notify pgrst, 'reload schema';
