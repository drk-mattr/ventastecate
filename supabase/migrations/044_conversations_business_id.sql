-- ============================================================
-- Business messaging (Option A, modified 2026-11-07): threads
-- tied to a business instead of a listing.
--
--   conversations.business_id (nullable) -> businesses(id) ON
--   DELETE SET NULL, same pattern as listing_id (030).
--   One thread per business + buyer + seller (unique index,
--   same race protection as the listing unique).
--   The INSERT policy (017) only allowed listing threads (the
--   seller must own the listing). It now also allows business
--   threads, but only when the seller actually claimed the
--   business (businesses.claimed_by = seller_id) — a thread to
--   an unclaimed business cannot be created at the database
--   level, and the UI never offers one (grayed-out disabled
--   button on unclaimed pages).
--
-- Defensive style (same as 029/030): every step is guarded and
-- reported as NOTICE, never aborting the rest. Run in the
-- Supabase SQL editor (or via the Management API) AFTER the
-- code is deployed. The code works before this migration runs:
-- the unclaimed path needs nothing from it, and the claimed
-- path fails soft (no claimed businesses exist yet).
-- Ends with a PostgREST schema reload.
-- ============================================================

-- ---------- 1. the column ----------

alter table public.conversations
  add column if not exists business_id uuid;

-- ---------- 2. FK to businesses, SET NULL ----------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations'
      and column_name = 'business_id'
  ) and not exists (
    select 1 from pg_constraint
    where conname = 'conversations_business_id_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    begin
      alter table public.conversations
        add constraint conversations_business_id_fkey
        foreign key (business_id) references public.businesses(id) on delete set null;
      raise notice 'added conversations_business_id_fkey';
    exception when others then
      raise notice 'could not add conversations_business_id_fkey: %', sqlerrm;
    end;
  else
    raise notice 'conversations_business_id_fkey already exists or business_id column missing — skipped';
  end if;
end $$;

-- ---------- 3. one thread per business + buyer + seller ----------

-- NULL business_id rows (listing threads) never collide: Postgres
-- treats NULLs as distinct in a unique index.
create unique index if not exists conversations_business_unique_idx
  on public.conversations (business_id, buyer_id, seller_id);

-- ---------- 4. INSERT policy: listing threads OR business threads ----------

drop policy if exists conversations_insert_valid on public.conversations;

create policy conversations_insert_valid on public.conversations
  for insert
  with check (
    auth.uid() = buyer_id
    and buyer_id <> seller_id
    and (
      (
        listing_id is not null
        and business_id is null
        and exists (
          select 1 from public.listings l
          where l.id = listing_id
            and l.user_id = seller_id
        )
      )
      or
      (
        business_id is not null
        and listing_id is null
        and exists (
          select 1 from public.businesses b
          where b.id = business_id
            and b.claimed_by = seller_id
        )
      )
    )
  );

notify pgrst, 'reload schema';
