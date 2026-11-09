-- 048_posting_funnel_events.sql
-- Completion counters for the 3-step posting flow (proposal
-- 2026-11-09, §0/§7): the stopwatch can't prove the steps worked,
-- started → published can. Two events, one tiny table, no other
-- schema change. The client inserts are best-effort (see
-- lib/listings/posting-funnel.ts) — the form works with or without
-- this table, so applying the migration is safe at any time.
--
-- NOTE: written with the 3-step PR, NOT applied by the build agent.
-- Apply with sb.py before (or right after) deploying the PR, then
-- verify with: select event, count(*) from posting_funnel_events
-- group by event;

create table if not exists public.posting_funnel_events (
  id uuid primary key default gen_random_uuid(),
  event text not null check (event in ('draft_started', 'draft_published')),
  listing_type text not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.posting_funnel_events enable row level security;

-- Signed-in posters log their own funnel events. No select policy:
-- reads go through the service role (admin / reporting only).
create policy "Authenticated can log funnel events"
  on public.posting_funnel_events
  for insert
  to authenticated
  with check (true);
