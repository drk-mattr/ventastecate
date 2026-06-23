-- ============================================================
-- Align the production listings table with the app's expectations.
--
-- Production was built from a different schema lineage (seller_id, category_id
-- NOT NULL, currency NOT NULL, condition NOT NULL, no store_id/user_id). The
-- current app uses user_id-based ownership, posts on behalf of a store via
-- store_id, and does not send the legacy required columns. This migration:
--   1. adds user_id (backfilled from seller_id) and store_id
--   2. relaxes the legacy NOT NULL columns the app no longer writes
--   3. repoints the RLS policies from seller_id to user_id
-- Harmless existing triggers (search_vector, updated_at) are left untouched.
-- ============================================================

-- 1. Ownership + store link the app uses
alter table public.listings add column if not exists user_id uuid references public.profiles(id) on delete cascade;
update public.listings set user_id = seller_id where user_id is null and seller_id is not null;

alter table public.listings add column if not exists store_id uuid references public.stores(id) on delete set null;

-- 2. Relax legacy required columns the current app doesn't populate
alter table public.listings alter column seller_id drop not null;
alter table public.listings alter column category_id drop not null;
alter table public.listings alter column currency drop not null;
alter table public.listings alter column condition drop not null;

-- 3. Repoint RLS policies from seller_id -> user_id
drop policy if exists listings_auth_insert on public.listings;
create policy listings_auth_insert on public.listings
  for insert with check (auth.uid() = user_id);

drop policy if exists listings_own_update on public.listings;
create policy listings_own_update on public.listings
  for update using (auth.uid() = user_id);

drop policy if exists listings_own_delete on public.listings;
create policy listings_own_delete on public.listings
  for delete using (auth.uid() = user_id);

drop policy if exists listings_public_read on public.listings;
create policy listings_public_read on public.listings
  for select using (status = 'active' or user_id = auth.uid());

-- 4. Indexes + cache reload
create index if not exists listings_user_id_idx on public.listings(user_id);
create index if not exists listings_store_id_idx on public.listings(store_id);

notify pgrst, 'reload schema';
