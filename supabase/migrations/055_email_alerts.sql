-- Email alerts inbox (hola@). Apply in the Supabase SQL editor.
-- The ventastecate-mail Email Worker posts each incoming hola@ mail here
-- via /api/internal/email-alert (service-role key, bypassing RLS), and
-- forwards the original to Gmail. Only superadmin profiles can read via
-- RLS; the list lives at /admin/alerts.

create table if not exists public.email_alerts (
  id uuid default gen_random_uuid() primary key,
  from_address text not null,
  subject text not null default '',
  body text,
  received_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz default now() not null
);

create index if not exists email_alerts_status_idx on public.email_alerts(status, received_at desc);

alter table public.email_alerts enable row level security;

drop policy if exists "superadmin all email_alerts" on public.email_alerts;
create policy "superadmin all email_alerts" on public.email_alerts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  );
