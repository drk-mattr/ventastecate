-- Reports inbox + superadmin. Apply in the Supabase SQL editor.
-- Every report is stored here first, so a failed Discord webhook can never
-- lose one. Only superadmin profiles can read/write via RLS; the /api/report
-- route inserts with the service-role key, bypassing RLS.

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  type text not null,
  description text,
  email text,
  listing_id uuid references public.listings(id) on delete set null,
  listing_title text,
  reporter_id uuid references public.profiles(id) on delete set null,
  reporter_label text,
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.report_notes (
  id uuid default gen_random_uuid() primary key,
  report_id uuid not null references public.reports(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'note' check (kind in ('note', 'reply')),
  body text not null,
  created_at timestamptz default now() not null
);

create index if not exists reports_status_idx on public.reports(status, created_at desc);
create index if not exists reports_type_idx on public.reports(type, created_at desc);
create index if not exists report_notes_report_idx on public.report_notes(report_id, created_at asc);

alter table public.reports enable row level security;
alter table public.report_notes enable row level security;

drop policy if exists "superadmin all reports" on public.reports;
create policy "superadmin all reports" on public.reports
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  );

drop policy if exists "superadmin all report_notes" on public.report_notes;
create policy "superadmin all report_notes" on public.report_notes
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  );

-- Superadmin for the founder account. Run after the account exists; the
-- email below is the founder's own account email. Verify exactly one row
-- is updated before relying on admin access.
-- update public.profiles set is_superadmin = true
--   where id in (select id from auth.users where email = 'rovelo.ga@gmail.com');
