-- ============================================================
-- Messaging v2, Step 1 follow-up: restore the conversations
-- foreign keys that production is missing.
--
-- Root cause of the /api/messages/conversations 500 (found in the
-- Worker log 2026-11-05): PostgREST reports
--   "Could not find a relationship between 'conversations' and
--    'listings' in the schema cache"
-- for the listing:listings embed. schema.sql declares
--   conversations.listing_id -> listings(id) on delete cascade,
--   conversations.buyer_id  -> profiles(id) on delete cascade,
--   conversations.seller_id -> profiles(id) on delete cascade,
-- but NO migration ever creates the conversations table in prod —
-- prod was built on a different schema lineage (see 015's header),
-- and its conversations table evidently lacks these FKs. The same
-- missing FKs also break the listing/buyer/seller embeds in
-- app/messages/page.tsx (Contactar flow) and in
-- app/api/send-message-notification/route.ts.
--
-- Defensive style: every step is guarded. Orphan counts are
-- reported first (RAISE NOTICE, visible in the SQL editor output);
-- each FK is added only if its column exists, its constraint does
-- not already exist, and the ADD itself succeeds — a failure to add
-- one FK (e.g. orphan rows) is reported as a NOTICE and never
-- aborts the rest. End with a PostgREST schema reload so the new
-- relationships are visible to embeds immediately.
-- Run in the Supabase SQL editor.
-- ============================================================

-- ---------- report orphan rows (informational only) ----------

do $$
declare
  v_orphan_listings integer := 0;
  v_orphan_buyers integer := 0;
  v_orphan_sellers integer := 0;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations'
      and column_name = 'listing_id'
  ) then
    select count(*) into v_orphan_listings
    from public.conversations c
    where c.listing_id is not null
      and not exists (select 1 from public.listings l where l.id = c.listing_id);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations'
      and column_name = 'buyer_id'
  ) then
    select count(*) into v_orphan_buyers
    from public.conversations c
    where c.buyer_id is not null
      and not exists (select 1 from public.profiles p where p.id = c.buyer_id);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations'
      and column_name = 'seller_id'
  ) then
    select count(*) into v_orphan_sellers
    from public.conversations c
    where c.seller_id is not null
      and not exists (select 1 from public.profiles p where p.id = c.seller_id);
  end if;

  raise notice 'conversations orphans: listing_id=% buyer_id=% seller_id=% (0 means the FKs below can be added cleanly)',
    v_orphan_listings, v_orphan_buyers, v_orphan_sellers;
end $$;

-- ---------- add the missing FKs, one at a time, never aborting ----------

do $$
begin
  -- listing_id -> listings(id) on delete cascade
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations'
      and column_name = 'listing_id'
  ) and not exists (
    select 1 from pg_constraint
    where conname = 'conversations_listing_id_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    begin
      alter table public.conversations
        add constraint conversations_listing_id_fkey
        foreign key (listing_id) references public.listings(id) on delete cascade;
      raise notice 'added conversations_listing_id_fkey';
    exception when others then
      raise notice 'could not add conversations_listing_id_fkey (orphan rows?): %', sqlerrm;
    end;
  else
    raise notice 'conversations_listing_id_fkey already exists or listing_id column missing — skipped';
  end if;

  -- buyer_id -> profiles(id) on delete cascade
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations'
      and column_name = 'buyer_id'
  ) and not exists (
    select 1 from pg_constraint
    where conname = 'conversations_buyer_id_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    begin
      alter table public.conversations
        add constraint conversations_buyer_id_fkey
        foreign key (buyer_id) references public.profiles(id) on delete cascade;
      raise notice 'added conversations_buyer_id_fkey';
    exception when others then
      raise notice 'could not add conversations_buyer_id_fkey (orphan rows?): %', sqlerrm;
    end;
  else
    raise notice 'conversations_buyer_id_fkey already exists or buyer_id column missing — skipped';
  end if;

  -- seller_id -> profiles(id) on delete cascade
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations'
      and column_name = 'seller_id'
  ) and not exists (
    select 1 from pg_constraint
    where conname = 'conversations_seller_id_fkey'
      and conrelid = 'public.conversations'::regclass
  ) then
    begin
      alter table public.conversations
        add constraint conversations_seller_id_fkey
        foreign key (seller_id) references public.profiles(id) on delete cascade;
      raise notice 'added conversations_seller_id_fkey';
    exception when others then
      raise notice 'could not add conversations_seller_id_fkey (orphan rows?): %', sqlerrm;
    end;
  else
    raise notice 'conversations_seller_id_fkey already exists or seller_id column missing — skipped';
  end if;
end $$;

notify pgrst, 'reload schema';
