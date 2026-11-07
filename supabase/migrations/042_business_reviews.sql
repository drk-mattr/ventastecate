-- 042_business_reviews.sql
--
-- Business ratings + reviews: one rating (1–5 stars) with an optional
-- short written review per user per business. A review is public
-- feedback on a business shell — it is NOT a recommendation and it
-- feeds no score: ratings are display-only in v1 (no ranking impact,
-- same rule as item comments under §7.2).
--
-- The claimed owner of a business cannot review their own business
-- (enforced in POST /api/businesses/[id]/reviews — a 403; the RLS
-- below only enforces "as yourself").
--
-- A report on a review OPENS A REVIEW in /admin/reports — it never
-- hides the review (same rule as items and stories: a single report
-- must not remove content). The moderator resolves it in the inbox.
--
-- The user runs this in the Supabase SQL editor. The app degrades
-- gracefully until it is applied: the business page renders without
-- the reviews section, and the review/report routes answer 503 when
-- the table is missing.
--
-- Safe to run once (IF NOT EXISTS).

create table if not exists public.business_reviews (
  id uuid default gen_random_uuid() primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  body text check (body is null or char_length(body) <= 1000),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(business_id, user_id)
);

create index if not exists business_reviews_business_idx
  on public.business_reviews (business_id, created_at desc);

-- Business-review reports ride the existing reports inbox.
alter table public.reports
  add column if not exists business_review_id uuid references public.business_reviews(id) on delete set null;

create index if not exists reports_business_review_idx
  on public.reports (business_review_id);

alter table public.business_reviews enable row level security;

-- Anyone (anon + signed-in) can read reviews.
drop policy if exists "public read business reviews" on public.business_reviews;
create policy "public read business reviews" on public.business_reviews
  for select using (true);

-- A signed-in user can review only as themselves.
drop policy if exists "authenticated insert own business review" on public.business_reviews;
create policy "authenticated insert own business review" on public.business_reviews
  for insert with check (auth.uid() = user_id);

-- The author can update their own review (edit rating/body).
drop policy if exists "owner update own business review" on public.business_reviews;
create policy "owner update own business review" on public.business_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The author can delete their own review.
drop policy if exists "owner delete own business review" on public.business_reviews;
create policy "owner delete own business review" on public.business_reviews
  for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
