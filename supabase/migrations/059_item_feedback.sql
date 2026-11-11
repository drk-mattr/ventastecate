-- Gastro v1 — item_feedback + missing food kinds (059)
--
-- The brief's future contract (§6, §7.2), brought forward for
-- food: one yes/no answer to "¿Lo recomendarías?" per user per
-- offering. One ACTIVE opinion per user per item (PK); changing
-- your mind updates, never duplicates. No numeric score is ever
-- derived from this table in v1 — the count of recommends is the
-- aggregate, and it only shows once 5 independent opinions exist
-- (the UI gates the count; the table stores every opinion).
--
-- Evidence stays separate (§6, second round): the claimed owner's
-- opinion never counts — enforced in the API (403), not in RLS,
-- same as business reviews. The aggregate reader (fetchItemFeedback)
-- also excludes the claimed owner's rows dynamically, so an opinion
-- given before a later claim never becomes a recommendation.
--
-- Idempotent style: IF NOT EXISTS / ON CONFLICT / DROP POLICY IF
-- EXISTS throughout, like 034.

-- ============================================================
-- item_feedback
-- ============================================================
create table if not exists public.item_feedback (
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  recommends boolean not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  primary key (item_id, user_id)
);

comment on table public.item_feedback is
  'One yes/no answer to "¿Lo recomendarías?" per user per offering (brief §7.2, brought forward for Gastro v1).';

create index if not exists item_feedback_user_idx
  on public.item_feedback (user_id);

-- updated_at maintenance reuses the 034 helper (set_item_updated_at).
drop trigger if exists on_item_feedback_set_updated_at on public.item_feedback;
create trigger on_item_feedback_set_updated_at
  before update on public.item_feedback
  for each row execute function public.set_item_updated_at();

alter table public.item_feedback enable row level security;

-- Anyone (anon + signed-in) can read opinions.
drop policy if exists "public read item feedback" on public.item_feedback;
create policy "public read item feedback" on public.item_feedback
  for select using (true);

-- A signed-in user can opine only as themselves.
drop policy if exists "authenticated insert own item feedback" on public.item_feedback;
create policy "authenticated insert own item feedback" on public.item_feedback
  for insert with check (auth.uid() = user_id);

drop policy if exists "authenticated update own item feedback" on public.item_feedback;
create policy "authenticated update own item feedback" on public.item_feedback
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The author can clear their own opinion.
drop policy if exists "owner delete own item feedback" on public.item_feedback;
create policy "owner delete own item feedback" on public.item_feedback
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Seed the missing food kinds (Gastro proposal §1)
-- ============================================================
-- All seven were missing live (verified 2026-11-11: 44 kinds, none
-- of these slugs exist). Parentage per the proposal: raspados and
-- nieves under postres; elotes, esquites and tortillas under a new
-- 'antojitos' parent; tejuino and aguas frescas under bebidas.
-- Idempotent: ON CONFLICT DO NOTHING throughout, like the 034 seed.
insert into public.item_kinds (slug, name, status) values
  ('antojitos', 'Antojitos', 'approved')
on conflict (slug) do nothing;

insert into public.item_kinds (slug, name, parent_id, status) values
  ('elotes', 'Elotes', (select id from public.item_kinds where slug = 'antojitos'), 'approved'),
  ('esquites', 'Esquites', (select id from public.item_kinds where slug = 'antojitos'), 'approved'),
  ('tortillas', 'Tortillas', (select id from public.item_kinds where slug = 'antojitos'), 'approved'),
  ('raspados', 'Raspados', (select id from public.item_kinds where slug = 'postres'), 'approved'),
  ('nieves', 'Nieves', (select id from public.item_kinds where slug = 'postres'), 'approved'),
  ('tejuino', 'Tejuino', (select id from public.item_kinds where slug = 'bebidas'), 'approved'),
  ('aguas-frescas', 'Aguas frescas', (select id from public.item_kinds where slug = 'bebidas'), 'approved')
on conflict (slug) do nothing;

-- Obvious singular aliases (the no-accent singular spellings people
-- actually type), like the 034 seed. search_key is generated, so
-- only the alias is inserted.
insert into public.item_kind_aliases (kind_id, alias) values
  ((select id from public.item_kinds where slug = 'elotes'), 'elote'),
  ((select id from public.item_kinds where slug = 'esquites'), 'esquite'),
  ((select id from public.item_kinds where slug = 'tortillas'), 'tortilla'),
  ((select id from public.item_kinds where slug = 'raspados'), 'raspado'),
  ((select id from public.item_kinds where slug = 'nieves'), 'nieve'),
  ((select id from public.item_kinds where slug = 'aguas-frescas'), 'agua fresca')
on conflict (search_key) do nothing;

notify pgrst, 'reload schema';
