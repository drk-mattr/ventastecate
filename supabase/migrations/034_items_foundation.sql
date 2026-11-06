-- ============================================================
-- Items indexing engine, stage 034A — Foundation (brief v1.1 §6, §12).
--
-- Tables: item_kinds, item_kind_aliases, items (the offering:
-- one business + one kind), listing_item_tags (the mention),
-- item_reports (review queue — a report NEVER hides anything on
-- its own), item_audit_events (append-only history).
--
-- Deliberately NOT in 034A: item_feedback (future — see the
-- contract note at the end of this file), any UI, any posting
-- flow, any ranking code, any recommendation computation.
-- activity_score is built in 034D; recommendation_score is a
-- future contract only — no score is invented before the
-- feedback data exists.
--
-- Evidence stays separate in the model (§6, second round):
--   business claims           -> items.origin = 'owner_claim'
--   community observations    -> listing_item_tags
--   community recommendations -> item_feedback (future)
-- No score ever reads from a source that is not its own.
--
-- Place: an item has NO place column. Its place is always
-- derived from its business's town at query time (§11.1),
-- using lib/business-regions.ts (TOWN_REGIONS). Place filters
-- join businesses; no new index on businesses is created here.
--
-- Guarded/idempotent style (prod lineage differs from schema.sql):
-- IF NOT EXISTS / ON CONFLICT / DROP POLICY IF EXISTS throughout;
-- ends with `notify pgrst, 'reload schema'`. Run in the
-- Supabase SQL editor.
-- ============================================================

-- pg_trgm: the §5 fuzzy/alias suggestion pipeline (indexed fuzzy
-- matching and spelling suggestions). Migration 008 already
-- assumed it for businesses_name_trgm_idx; enable it here so
-- the trigram indexes below cannot fail.
create extension if not exists pg_trgm;

-- ---------- search-key normalization (§5) ----------
-- Lowercase, accents stripped, whitespace collapsed. Connecting
-- words (de, con) are NOT stripped: "café con leche" and
-- "café de leche" must not auto-merge.
create or replace function public.normalize_search_key(input text)
returns text
language sql
immutable
as $$
  select btrim(regexp_replace(translate(lower(coalesce(input, '')), 'áéíóúüñ', 'aeiouun'), '\s+', ' ', 'g'));
$$;

-- ---------- updated_at maintenance ----------
create or replace function public.set_item_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- item_kinds: the taxonomy (§3, §5)
-- ============================================================
create table if not exists public.item_kinds (
  id uuid default gen_random_uuid() primary key,
  slug text not null,
  name text not null,
  parent_id uuid references public.item_kinds(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'merged', 'rejected')),
  merge_to uuid references public.item_kinds(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint item_kinds_slug_unique unique (slug),
  constraint item_kinds_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  constraint item_kinds_merge_needs_target check (status <> 'merged' or merge_to is not null),
  constraint item_kinds_merge_not_self check (merge_to is null or merge_to <> id)
);
comment on table public.item_kinds is
  'Item kinds (taxonomy tree, §3). One PRIMARY parent; status distinguishes an approved root (parent_id null, approved) from an unclassified proposal (parent_id null, pending). A merged kind keeps merge_to so old references redirect.';
comment on column public.item_kinds.status is
  'pending = proposed, not placed yet; approved = in the tree; merged = fused into merge_to; rejected = does not enter.';

-- A kind may never be its own ancestor (§5: cycle protection).
create or replace function public.check_item_kind_no_cycle()
returns trigger
language plpgsql
as $$
declare
  v_parent uuid := new.parent_id;
  v_depth int := 0;
begin
  if new.parent_id is null then
    return new;
  end if;
  while v_parent is not null loop
    v_depth := v_depth + 1;
    if v_depth > 100 then
      raise exception 'item_kinds parent chain too deep (possible cycle)';
    end if;
    if v_parent = new.id then
      raise exception 'item_kinds cycle: a kind cannot be its own ancestor';
    end if;
    select parent_id into v_parent from public.item_kinds where id = v_parent;
  end loop;
  return new;
end;
$$;

drop trigger if exists on_item_kind_no_cycle on public.item_kinds;
create trigger on_item_kind_no_cycle
  before insert or update of parent_id on public.item_kinds
  for each row execute function public.check_item_kind_no_cycle();

drop trigger if exists on_item_kinds_set_updated_at on public.item_kinds;
create trigger on_item_kinds_set_updated_at
  before update on public.item_kinds
  for each row execute function public.set_item_updated_at();

-- ============================================================
-- item_kind_aliases: aliases in their own table (§5)
-- ============================================================
create table if not exists public.item_kind_aliases (
  id uuid default gen_random_uuid() primary key,
  kind_id uuid not null references public.item_kinds(id) on delete cascade,
  alias text not null,
  search_key text generated always as (public.normalize_search_key(alias)) stored,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  constraint item_kind_aliases_search_key_unique unique (search_key)
);
comment on table public.item_kind_aliases is
  'Alias variants that resolve to one canonical kind (§5). search_key is the normalized form (lowercase, no accents, collapsed spaces) and is unique: one alias belongs to one kind only.';

-- ============================================================
-- items: the OFFERING — one business + one kind (§3)
-- ============================================================
-- An item is an offering, NOT a SKU: a café with three different
-- lattes or a tire shop with five tire models in the same size
-- cannot be distinguished here. That is a future product/variant
-- layer, not this table.
create table if not exists public.items (
  id uuid default gen_random_uuid() primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind_id uuid not null references public.item_kinds(id) on delete restrict,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'reviewing')),
  origin text not null default 'community' check (origin in ('owner_claim', 'community', 'mention')),
  price numeric(10, 2) check (price is null or price >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  merge_to uuid references public.items(id) on delete set null,
  constraint items_business_kind_unique unique (business_id, kind_id),
  constraint items_merge_not_self check (merge_to is null or merge_to <> id)
);
comment on table public.items is
  'The offering: one business + one kind (§3). UNIQUE(business_id, kind_id) — two users creating the same offering concurrently collide on this constraint and the second resolves to the existing row (conflict-safe upsert, §5). The offering belongs to the business; hide it with the business, never delete it to moderate.';
comment on column public.items.origin is
  'Where the offering came from (second round): owner_claim = the claimed owner put it there (authoritative on menu/services only); community = a user added it; mention = born when someone posted about it. Quality/recommendation signals NEVER read this column.';
comment on column public.items.status is
  'visible / hidden / reviewing. Hiding is a status change, not a delete: hidden rows stay in the DB and every public query must respect the status.';
comment on column public.items.price is
  'Phase 2; almost always null in v1. Set by the claimed owner (display curation, §4).';

-- Claimed owners curate display fields only (§4, §6 matrix).
-- The service role (auth.uid() null) and superadmins may change
-- anything; a regular owner may only change price (updated_at is
-- maintained by its own trigger). Anything else raises.
create or replace function public.check_items_owner_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and is_superadmin) then
    return new;
  end if;
  if new.business_id is distinct from old.business_id
    or new.kind_id is distinct from old.kind_id
    or new.status is distinct from old.status
    or new.origin is distinct from old.origin
    or new.created_by is distinct from old.created_by
    or new.merge_to is distinct from old.merge_to
    or new.created_at is distinct from old.created_at then
    raise exception 'items: owners may only change display fields (price)';
  end if;
  return new;
end;
$$;

drop trigger if exists on_items_owner_update on public.items;
create trigger on_items_owner_update
  before update on public.items
  for each row execute function public.check_items_owner_update();

drop trigger if exists on_items_set_updated_at on public.items;
create trigger on_items_set_updated_at
  before update on public.items
  for each row execute function public.set_item_updated_at();

-- ============================================================
-- listing_item_tags: the mention — listing -> offering (§3)
-- ============================================================
create table if not exists public.listing_item_tags (
  listing_id uuid not null references public.listings(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  is_primary boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  primary key (listing_id, item_id)
);
comment on table public.listing_item_tags is
  'The mention: a listing names an offering (§3). PK(listing_id, item_id) — one listing mentions one offering once. is_primary: one primary offering per listing (enforced by the partial unique index below); secondary tags do not get the full weight of the listing (§7.4).';

-- One primary offering per listing (§7.4).
create unique index if not exists listing_item_tags_one_primary_idx
  on public.listing_item_tags (listing_id) where is_primary;

-- Business consistency (§6): the item and the listing must refer
-- to the SAME business (the listing's tagged_business_id). This
-- is a database guarantee, never a client-side check alone: a
-- listing with no tagged business cannot be tagged at all
-- (decision 4 — no item tag without the business), and an item
-- from another business is rejected. SECURITY DEFINER so the
-- check can read listings/items regardless of the caller's RLS;
-- search_path is locked and the function only reads the two ids.
create or replace function public.check_listing_item_tag_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_business uuid;
  v_item_business uuid;
begin
  select tagged_business_id into v_listing_business
    from public.listings where id = new.listing_id;
  select business_id into v_item_business
    from public.items where id = new.item_id;
  if v_listing_business is null then
    raise exception 'listing_item_tags: listing % has no tagged business', new.listing_id
      using errcode = 'check_violation';
  end if;
  if v_item_business is distinct from v_listing_business then
    raise exception 'listing_item_tags: item % belongs to a different business than listing %', new.item_id, new.listing_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists on_listing_item_tag_business on public.listing_item_tags;
create trigger on_listing_item_tag_business
  before insert or update of item_id, listing_id on public.listing_item_tags
  for each row execute function public.check_listing_item_tag_business();

-- ============================================================
-- item_reports: reports are a review flow, not a hide button (§4)
-- ============================================================
-- A single "incorrect information" report NEVER hides a
-- legitimate offering (§14). The report opens a review; the
-- offering stays visible while the moderator decides. Automatic
-- hiding is reserved for narrowly defined high-risk cases
-- (prohibited content, evident spam) with safeguards — not for
-- ordinary incorrect-information reports. No trigger in this
-- migration changes any item status when a report is inserted.
create table if not exists public.item_reports (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.items(id) on delete cascade,
  kind_id uuid references public.item_kinds(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('incorrecto', 'duplicado', 'spam', 'prohibido', 'otro')),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  constraint item_reports_target check (item_id is not null or kind_id is not null)
);

-- ============================================================
-- item_audit_events: immutable history (§6)
-- ============================================================
create table if not exists public.item_audit_events (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.items(id) on delete set null,
  kind_id uuid references public.item_kinds(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  event text not null check (event in ('created', 'corrected', 'merged', 'hidden', 'restored', 'reported', 'approved', 'rejected')),
  details jsonb,
  created_at timestamptz default now() not null
);
comment on table public.item_audit_events is
  'Immutable history of creations, corrections, merges and moderation actions (§6). Append-only: the trigger below blocks update/delete for everyone, including the service role. Only the service role inserts (no insert policy).';

create or replace function public.forbid_item_audit_events_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'item_audit_events is append-only';
end;
$$;

drop trigger if exists on_item_audit_events_immutable on public.item_audit_events;
create trigger on_item_audit_events_immutable
  before update or delete on public.item_audit_events
  for each row execute function public.forbid_item_audit_events_change();

-- ============================================================
-- Indexes (§6)
-- ============================================================
create index if not exists item_kinds_parent_idx
  on public.item_kinds (parent_id);
create index if not exists item_kinds_status_idx
  on public.item_kinds (status, created_at desc);
create index if not exists item_kinds_name_trgm_idx
  on public.item_kinds using gin (name gin_trgm_ops);
create index if not exists item_kind_aliases_kind_idx
  on public.item_kind_aliases (kind_id);
create index if not exists item_kind_aliases_search_key_trgm_idx
  on public.item_kind_aliases using gin (search_key gin_trgm_ops);
create index if not exists items_business_idx
  on public.items (business_id);
create index if not exists items_kind_idx
  on public.items (kind_id);
create index if not exists items_status_idx
  on public.items (status, created_at desc);
create index if not exists listing_item_tags_item_idx
  on public.listing_item_tags (item_id);
create index if not exists item_reports_item_idx
  on public.item_reports (item_id);
create index if not exists item_reports_status_idx
  on public.item_reports (status, created_at desc);
create index if not exists item_reports_reporter_idx
  on public.item_reports (reporter_id);
create index if not exists item_audit_events_item_idx
  on public.item_audit_events (item_id, created_at desc);
create index if not exists item_audit_events_kind_idx
  on public.item_audit_events (kind_id, created_at desc);
-- Active-publication timestamps for the 034D activity queries:
-- the composite (status, created_at) does not exist yet (schema.sql
-- has separate status and created_at indexes on listings).
create index if not exists listings_status_created_idx
  on public.listings (status, created_at desc);
-- Location filters join businesses and use its existing indexes;
-- no new index on businesses is created in 034A.

-- ============================================================
-- RLS (§6 authorization matrix)
-- Writes that need column-level rules the policy language cannot
-- express (owner display-curation) are enforced by the triggers
-- above; mutations that need moderation go through server routes
-- with the service-role key (repo pattern, migration 032).
-- ============================================================
alter table public.item_kinds enable row level security;
alter table public.item_kind_aliases enable row level security;
alter table public.items enable row level security;
alter table public.listing_item_tags enable row level security;
alter table public.item_reports enable row level security;
alter table public.item_audit_events enable row level security;

-- item_kinds: visitors read approved kinds; anyone can read a kind
-- they proposed themselves (so a pending kind is visible on its
-- own offering). New kinds start pending, parentless, unmerged.
drop policy if exists "item_kinds readable" on public.item_kinds;
create policy "item_kinds readable"
  on public.item_kinds for select using (
    status = 'approved' or created_by = auth.uid()
  );
drop policy if exists "item_kinds insert pending" on public.item_kinds;
create policy "item_kinds insert pending"
  on public.item_kinds for insert with check (
    created_by = auth.uid()
    and status = 'pending'
    and parent_id is null
    and merge_to is null
  );
drop policy if exists "superadmin all item_kinds" on public.item_kinds;
create policy "superadmin all item_kinds"
  on public.item_kinds for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  );

-- item_kind_aliases: readable when their kind is approved (or own);
-- anyone authenticated may propose an alias, attributed.
drop policy if exists "item_kind_aliases readable" on public.item_kind_aliases;
create policy "item_kind_aliases readable"
  on public.item_kind_aliases for select using (
    exists (select 1 from public.item_kinds k where k.id = kind_id and (k.status = 'approved' or k.created_by = auth.uid()))
  );
drop policy if exists "item_kind_aliases insert" on public.item_kind_aliases;
create policy "item_kind_aliases insert"
  on public.item_kind_aliases for insert with check (created_by = auth.uid());
drop policy if exists "superadmin all item_kind_aliases" on public.item_kind_aliases;
create policy "superadmin all item_kind_aliases"
  on public.item_kind_aliases for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  );

-- items: public reads visible offerings only. Inserts are
-- attributed and start visible; origin 'owner_claim' only when
-- the inserter is the business's claimed owner. Owners update
-- their own claimed business's offerings (column rules in the
-- trigger); superadmins manage statuses and merges.
drop policy if exists "items readable" on public.items;
create policy "items readable"
  on public.items for select using (status = 'visible');
drop policy if exists "items insert" on public.items;
create policy "items insert"
  on public.items for insert with check (
    created_by = auth.uid()
    and status = 'visible'
    and (
      origin in ('community', 'mention')
      or (origin = 'owner_claim' and exists (select 1 from public.businesses b where b.id = business_id and b.claimed_by = auth.uid()))
    )
  );
drop policy if exists "items owner update" on public.items;
create policy "items owner update"
  on public.items for update using (
    exists (select 1 from public.businesses b where b.id = business_id and b.claimed_by = auth.uid())
  ) with check (
    exists (select 1 from public.businesses b where b.id = business_id and b.claimed_by = auth.uid())
  );
drop policy if exists "superadmin all items" on public.items;
create policy "superadmin all items"
  on public.items for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  );

-- listing_item_tags: public reads tags on visible offerings of
-- publicly visible listings (active or sold; only 'inactive' is
-- hidden). Only the listing's author may tag it, and only while
-- it is active; the business-consistency trigger rejects any
-- cross-business tag the policy let through. The author may
-- remove or re-mark their own tags.
drop policy if exists "listing_item_tags readable" on public.listing_item_tags;
create policy "listing_item_tags readable"
  on public.listing_item_tags for select using (
    exists (select 1 from public.items i where i.id = item_id and i.status = 'visible')
    and exists (select 1 from public.listings l where l.id = listing_id and l.status in ('active', 'sold'))
  );
drop policy if exists "listing_item_tags insert own" on public.listing_item_tags;
create policy "listing_item_tags insert own"
  on public.listing_item_tags for insert with check (
    created_by = auth.uid()
    and exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid() and l.status = 'active')
    and exists (select 1 from public.items i where i.id = item_id and i.status = 'visible')
  );
drop policy if exists "listing_item_tags author update" on public.listing_item_tags;
create policy "listing_item_tags author update"
  on public.listing_item_tags for update using (
    exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
    and exists (select 1 from public.items i where i.id = item_id and i.status = 'visible')
  );
drop policy if exists "listing_item_tags author delete" on public.listing_item_tags;
create policy "listing_item_tags author delete"
  on public.listing_item_tags for delete using (
    exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
  );
drop policy if exists "superadmin all listing_item_tags" on public.listing_item_tags;
create policy "superadmin all listing_item_tags"
  on public.listing_item_tags for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  );

-- item_reports: the reporter reads their own reports; only
-- superadmins see the queue and resolve. Inserting a report
-- changes no item status anywhere (see the note on the table).
drop policy if exists "item_reports reporter read" on public.item_reports;
create policy "item_reports reporter read"
  on public.item_reports for select using (
    reporter_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  );
drop policy if exists "item_reports insert" on public.item_reports;
create policy "item_reports insert"
  on public.item_reports for insert with check (
    reporter_id = auth.uid() and status = 'open'
  );
drop policy if exists "superadmin all item_reports" on public.item_reports;
create policy "superadmin all item_reports"
  on public.item_reports for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  );

-- item_audit_events: superadmins read; nobody inserts, updates or
-- deletes through RLS — only the service role writes (it bypasses
-- RLS), and the append-only trigger blocks update/delete for
-- everyone including the service role.
drop policy if exists "superadmin read item_audit_events" on public.item_audit_events;
create policy "superadmin read item_audit_events"
  on public.item_audit_events for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  );

-- ============================================================
-- Seed taxonomy (§13 draft, corrected in v1.1)
-- 10 parents / 30 children, food first. matcha and malteadas
-- are bebidas (not café); churros and donas are postres (not
-- pan dulce). All approved; created_by null = team-seeded.
-- Idempotent: ON CONFLICT DO NOTHING throughout.
-- ============================================================
insert into public.item_kinds (slug, name, status) values
  ('tacos', 'Tacos', 'approved'),
  ('tamales', 'Tamales', 'approved'),
  ('burritos', 'Burritos', 'approved'),
  ('cafe', 'Café', 'approved'),
  ('bebidas', 'Bebidas', 'approved'),
  ('pan-dulce', 'Pan dulce', 'approved'),
  ('postres', 'Postres', 'approved'),
  ('mariscos', 'Mariscos', 'approved'),
  ('hamburguesas', 'Hamburguesas', 'approved'),
  ('pizza', 'Pizza', 'approved')
on conflict (slug) do nothing;

insert into public.item_kinds (slug, name, parent_id, status) values
  ('tacos-de-pastor', 'Tacos de pastor', (select id from public.item_kinds where slug = 'tacos'), 'approved'),
  ('tacos-de-adobada', 'Tacos de adobada', (select id from public.item_kinds where slug = 'tacos'), 'approved'),
  ('tacos-de-asada', 'Tacos de asada', (select id from public.item_kinds where slug = 'tacos'), 'approved'),
  ('tacos-de-birria', 'Tacos de birria', (select id from public.item_kinds where slug = 'tacos'), 'approved'),
  ('tacos-de-pescado', 'Tacos de pescado', (select id from public.item_kinds where slug = 'tacos'), 'approved'),
  ('tacos-de-canasta', 'Tacos de canasta', (select id from public.item_kinds where slug = 'tacos'), 'approved'),
  ('tamales-de-rajas', 'Tamales de rajas', (select id from public.item_kinds where slug = 'tamales'), 'approved'),
  ('tamales-de-pollo', 'Tamales de pollo', (select id from public.item_kinds where slug = 'tamales'), 'approved'),
  ('tamales-de-puerco', 'Tamales de puerco', (select id from public.item_kinds where slug = 'tamales'), 'approved'),
  ('tamales-dulces', 'Tamales dulces', (select id from public.item_kinds where slug = 'tamales'), 'approved'),
  ('burrito-de-asada', 'Burrito de asada', (select id from public.item_kinds where slug = 'burritos'), 'approved'),
  ('burrito-de-adobada', 'Burrito de adobada', (select id from public.item_kinds where slug = 'burritos'), 'approved'),
  ('burrito-de-machaca', 'Burrito de machaca', (select id from public.item_kinds where slug = 'burritos'), 'approved'),
  ('cafe-de-olla', 'Café de olla', (select id from public.item_kinds where slug = 'cafe'), 'approved'),
  ('latte', 'Latte', (select id from public.item_kinds where slug = 'cafe'), 'approved'),
  ('matcha', 'Matcha', (select id from public.item_kinds where slug = 'bebidas'), 'approved'),
  ('malteada', 'Malteada', (select id from public.item_kinds where slug = 'bebidas'), 'approved'),
  ('licuado', 'Licuado', (select id from public.item_kinds where slug = 'bebidas'), 'approved'),
  ('conchas', 'Conchas', (select id from public.item_kinds where slug = 'pan-dulce'), 'approved'),
  ('churros', 'Churros', (select id from public.item_kinds where slug = 'postres'), 'approved'),
  ('donas', 'Donas', (select id from public.item_kinds where slug = 'postres'), 'approved'),
  ('ceviche', 'Ceviche', (select id from public.item_kinds where slug = 'mariscos'), 'approved'),
  ('aguachile', 'Aguachile', (select id from public.item_kinds where slug = 'mariscos'), 'approved'),
  ('coctel-de-camaron', 'Coctel de camarón', (select id from public.item_kinds where slug = 'mariscos'), 'approved'),
  ('hamburguesa-sencilla', 'Hamburguesa sencilla', (select id from public.item_kinds where slug = 'hamburguesas'), 'approved'),
  ('hamburguesa-con-queso', 'Hamburguesa con queso', (select id from public.item_kinds where slug = 'hamburguesas'), 'approved'),
  ('hamburguesa-doble', 'Hamburguesa doble', (select id from public.item_kinds where slug = 'hamburguesas'), 'approved'),
  ('pizza-pepperoni', 'Pizza pepperoni', (select id from public.item_kinds where slug = 'pizza'), 'approved'),
  ('pizza-hawaiana', 'Pizza hawaiana', (select id from public.item_kinds where slug = 'pizza'), 'approved'),
  ('pizza-mexicana', 'Pizza mexicana', (select id from public.item_kinds where slug = 'pizza'), 'approved')
on conflict (slug) do nothing;

-- A few obvious aliases (§3, §5): the no-space hashtag forms and
-- the singular/plural and accent-less spellings people actually
-- type. search_key is generated, so only the alias is inserted.
insert into public.item_kind_aliases (kind_id, alias) values
  ((select id from public.item_kinds where slug = 'tacos-de-pastor'), 'tacos al pastor'),
  ((select id from public.item_kinds where slug = 'tacos-de-pastor'), 'tacosdepastor'),
  ((select id from public.item_kinds where slug = 'tacos-de-adobada'), 'tacos adobada'),
  ((select id from public.item_kinds where slug = 'tacos-de-adobada'), 'tacosdeadobada'),
  ((select id from public.item_kinds where slug = 'tacos-de-adobada'), 'taco de adobada'),
  ((select id from public.item_kinds where slug = 'tacos-de-asada'), 'tacosdeasada'),
  ((select id from public.item_kinds where slug = 'tacos-de-birria'), 'tacosdebirria'),
  ((select id from public.item_kinds where slug = 'tacos-de-pescado'), 'tacosdepescado'),
  ((select id from public.item_kinds where slug = 'tamales-de-rajas'), 'tamalesderajas'),
  ((select id from public.item_kinds where slug = 'tamales-de-pollo'), 'tamalesdepollo'),
  ((select id from public.item_kinds where slug = 'cafe-de-olla'), 'cafedeolla'),
  ((select id from public.item_kinds where slug = 'malteada'), 'malteadas'),
  ((select id from public.item_kinds where slug = 'churros'), 'churro'),
  ((select id from public.item_kinds where slug = 'donas'), 'dona'),
  ((select id from public.item_kinds where slug = 'coctel-de-camaron'), 'coctel de camaron')
on conflict (search_key) do nothing;

-- ============================================================
-- FUTURE CONTRACT — item_feedback (NOT created in 034A)
-- ============================================================
-- The Recommendations stage (§7.2, §12) adds this table:
--   item_feedback (
--     item_id   uuid -> items, not null,
--     user_id   uuid -> profiles, not null,
--     recommends boolean,              -- yes/no to "¿Lo recomendarías?"
--     created_at timestamptz,
--     updated_at timestamptz,
--     primary key (item_id, user_id)   -- one ACTIVE opinion per
--                                       -- user per offering; changing
--                                       -- it updates, never duplicates
--   )
-- Rules that already bind the future table, so nothing built now
-- can contradict them: the claimed owner of a business may NOT
-- opine on their own offerings in item_feedback (their opinion
-- is not saved as a recommendation, or is saved and does not
-- count); recommendation_score reads ONLY item_feedback — never
-- listing interaction and never items.origin; until this table
-- has data, no recommendation_score is computed or displayed
-- anywhere (no number, no order, no label). activity_score
-- (034D) reads only listing_item_tags + listings.
-- ============================================================

notify pgrst, 'reload schema';
