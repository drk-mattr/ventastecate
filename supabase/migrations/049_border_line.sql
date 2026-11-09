-- 049_border_line.sql
-- La Garita (2026-11-09): border-line reporting for Tecate.
-- CBP official snapshots (polled every 30 min by POST
-- /api/border/sync) + community reports + confirm/deny votes.
-- CBP measures into the US only; southbound waits exist only as
-- community reports. There is NO SENTRI / Ready Lane at Tecate —
-- the three lanes below are the whole lane list, never offer more.
--
-- NOT applied by the build agent. Apply at go-time with sb.py,
-- then verify:
--   select table_name from information_schema.tables
--   where table_schema = 'public'
--   and table_name in ('border_line_reports','border_line_snapshots','border_line_votes');

create table if not exists public.border_line_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  port text not null default 'tecate',
  lane text not null check (lane in ('auto', 'peatonal', 'comercial')),
  direction text not null default 'norte' check (direction in ('norte', 'sur')),
  wait_minutes int not null check (wait_minutes >= 0 and wait_minutes <= 360),
  status text not null check (status in ('en_fila', 'ya_cruce')),
  note text check (note is null or char_length(note) <= 280),
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists border_line_reports_lane_direction_idx
  on public.border_line_reports (lane, direction, created_at desc);
create index if not exists border_line_reports_user_lane_idx
  on public.border_line_reports (user_id, lane, direction, created_at desc);

alter table public.border_line_reports enable row level security;

-- Signed-in users file their own reports; anyone (including anon)
-- can read them — the page is public.
create policy "Authenticated can file border reports"
  on public.border_line_reports
  for insert
  to authenticated
  with check (true);
create policy "Border reports are public"
  on public.border_line_reports
  for select
  to anon, authenticated
  using (true);

create table if not exists public.border_line_snapshots (
  id uuid primary key default gen_random_uuid(),
  port text not null default 'tecate',
  lane text not null check (lane in ('auto', 'peatonal', 'comercial')),
  source text not null default 'cbp',
  delay_minutes int,
  lanes_open int,
  operational_status text,
  cbp_update_time text,
  fetched_at timestamptz not null default now()
);

create index if not exists border_line_snapshots_lane_fetched_idx
  on public.border_line_snapshots (lane, fetched_at desc);

alter table public.border_line_snapshots enable row level security;

-- Snapshots are written by the service role (sync route) only;
-- reads are public so the page can show history.
create policy "Border snapshots are public"
  on public.border_line_snapshots
  for select
  to anon, authenticated
  using (true);

create table if not exists public.border_line_votes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.border_line_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote text not null check (vote in ('confirma', 'niega')),
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

create index if not exists border_line_votes_report_idx
  on public.border_line_votes (report_id, created_at desc);

alter table public.border_line_votes enable row level security;

-- Signed-in users vote; anyone can read the counts.
create policy "Authenticated can vote on border reports"
  on public.border_line_votes
  for insert
  to authenticated
  with check (true);
create policy "Border votes are public"
  on public.border_line_votes
  for select
  to anon, authenticated
  using (true);
