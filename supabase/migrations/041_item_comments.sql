-- 041_item_comments.sql
--
-- Item view (carousel + /items/[id]): per-item comments. A comment is
-- a short public note on ONE offering (business + kind) — the item
-- view's discussion surface. It is NOT a listing comment and NOT a
-- recommendation: it feeds no score (§7.2 — recommendation_score
-- does not exist until item_feedback data exists).
--
-- A report on a comment OPENS A REVIEW in /admin/reports — it never
-- hides the comment (same rule as items and stories: a single report
-- must not remove content). The moderator resolves it in the inbox.
--
-- The user runs this in the Supabase SQL editor. The app degrades
-- gracefully until it is applied: the item view renders without the
-- comments section, and the comment/report routes answer 503 when
-- the table is missing.
--
-- Safe to run once (IF NOT EXISTS).

create table if not exists public.item_comments (
  id uuid default gen_random_uuid() primary key,
  item_id uuid not null references public.items(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 1000),
  created_at timestamptz default now() not null
);

create index if not exists item_comments_item_idx
  on public.item_comments (item_id, created_at);

-- Item-comment reports ride the existing reports inbox.
alter table public.reports
  add column if not exists item_comment_id uuid references public.item_comments(id) on delete set null;

create index if not exists reports_item_comment_idx
  on public.reports (item_comment_id);

alter table public.item_comments enable row level security;

-- Anyone (anon + signed-in) can read comments.
drop policy if exists "public read item comments" on public.item_comments;
create policy "public read item comments" on public.item_comments
  for select using (true);

-- A signed-in user can comment only as themselves.
drop policy if exists "authenticated insert own item comment" on public.item_comments;
create policy "authenticated insert own item comment" on public.item_comments
  for insert with check (auth.uid() = author_id);

-- The author can delete their own comment.
drop policy if exists "owner delete own item comment" on public.item_comments;
create policy "owner delete own item comment" on public.item_comments
  for delete using (auth.uid() = author_id);

notify pgrst, 'reload schema';
