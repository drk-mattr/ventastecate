-- ============================================================
-- Messaging v2, Step 3: conversations survive listing deletion.
--
-- Today conversations.listing_id -> listings(id) ON DELETE CASCADE
-- (restored by migration 029), so deleting a listing wipes the
-- whole conversation history with it. From here on a deleted
-- listing only detaches: the thread stays readable, showing the
-- title snapshot taken when the conversation was created.
--
-- Steps:
--   1. Backfill listing_title from listings where they still exist.
--   2. Null out listing_ids that already point at missing listings
--      (orphans whose titles are unrecoverable) so the FK re-add
--      below cannot fail on them.
--   3. Make listing_id nullable if prod has it NOT NULL (prod was
--      built on a different schema lineage than schema.sql, so
--      check first — never assume).
--   4. Drop the CASCADE FK, re-add it ON DELETE SET NULL.
--
-- Defensive style (same as 029): every step is guarded, failures
-- are reported as NOTICE and never abort the rest. Run in the
-- Supabase SQL editor AFTER the Step 3 code is deployed. The code
-- works before this migration runs too: listing_title is only read
-- when the column exists, and the conversations route tolerates a
-- missing listing_title / null listing_id.
-- Ends with a PostgREST schema reload.
-- ============================================================

-- ---------- 1. add the snapshot column + backfill ----------

alter table public.conversations
  add column if not exists listing_title text;

update public.conversations c
set listing_title = l.title
from public.listings l
where l.id = c.listing_id
  and c.listing_title is null;

-- ---------- 2. null out orphans (titles unrecoverable) ----------

do $$
declare
  v_orphans integer := 0;
begin
  update public.conversations c
  set listing_id = null
  where c.listing_id is not null
    and not exists (select 1 from public.listings l where l.id = c.listing_id);
  get diagnostics v_orphans = row_count;
  raise notice 'orphan listing_ids nulled: % (threads whose listings were already gone)', v_orphans;
end $$;

-- ---------- 3. listing_id must be nullable for SET NULL ----------

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations'
      and column_name = 'listing_id' and is_nullable = 'NO'
  ) then
    alter table public.conversations alter column listing_id drop not null;
    raise notice 'listing_id is now nullable';
  else
    raise notice 'listing_id already nullable or column missing — skipped';
  end if;
end $$;

-- ---------- 4. swap the FK from CASCADE to SET NULL ----------

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'conversations_listing_id_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations drop constraint conversations_listing_id_fkey;
    raise notice 'dropped conversations_listing_id_fkey (on delete cascade)';
  else
    raise notice 'conversations_listing_id_fkey not found — nothing to drop';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'conversations_listing_id_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    begin
      alter table public.conversations
        add constraint conversations_listing_id_fkey
        foreign key (listing_id) references public.listings(id) on delete set null;
      raise notice 'added conversations_listing_id_fkey (on delete set null)';
    exception when others then
      raise notice 'could not add conversations_listing_id_fkey: %', sqlerrm;
    end;
  else
    raise notice 'conversations_listing_id_fkey already exists — skipped';
  end if;
end $$;

notify pgrst, 'reload schema';
