-- Moderation audit log for the internal moderator endpoint.
-- Apply in the Supabase SQL editor. Hides/restores are reversible and
-- logged here with a reason, so they can be audited and reversed.
-- The endpoint works without this table (it reports logged: false),
-- but applying it is recommended before using moderation in production.

create table if not exists public.moderation_log (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  action text not null check (action in ('hide', 'restore')),
  reason text not null,
  actor text not null default 'internal-community',
  created_at timestamptz default now() not null
);

create index if not exists moderation_log_listing_idx on public.moderation_log(listing_id, created_at desc);
