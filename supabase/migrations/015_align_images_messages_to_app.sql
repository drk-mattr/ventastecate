-- ============================================================
-- Align listing_images, messages, and profiles with the app.
--
-- Production uses a different schema lineage than the app:
--   listing_images: has url / sort_order      -> app writes image_url / order_index
--   messages:       has thread_id / body      -> app writes conversation_id / content / read
--   profiles:       has followers_count only  -> app/follows also expect following_count
--
-- Strategy mirrors 014: add the columns the app uses (backfilled from the legacy
-- ones), relax the legacy NOT NULLs, and repoint RLS from seller_id/thread_id to
-- the user_id/conversation model. Existing rows are preserved.
-- ============================================================

-- ---------- listing_images ----------
alter table public.listing_images add column if not exists image_url text;
alter table public.listing_images add column if not exists order_index integer not null default 0;
update public.listing_images set image_url = url where image_url is null and url is not null;
update public.listing_images set order_index = sort_order where sort_order is not null;
alter table public.listing_images alter column url drop not null;
alter table public.listing_images alter column sort_order drop not null;

-- RLS: owner check via listings.user_id (was listings.seller_id)
drop policy if exists images_seller_all on public.listing_images;
create policy images_owner_all on public.listing_images for all
  using (exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid()));
-- (images_public_read [SELECT using true] is fine, left as-is)

-- ---------- messages ----------
alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.messages add column if not exists content text;
alter table public.messages add column if not exists read boolean not null default false;
alter table public.messages alter column thread_id drop not null;
alter table public.messages alter column body drop not null;
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);

-- RLS: conversation-based access (was message_threads / thread_id based)
drop policy if exists messages_thread_read on public.messages;
drop policy if exists messages_conversation_read on public.messages;
create policy messages_conversation_read on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ));

drop policy if exists messages_auth_send on public.messages;
create policy messages_auth_send on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists messages_conversation_update on public.messages;
create policy messages_conversation_update on public.messages for update
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ));

-- ---------- profiles ----------
alter table public.profiles add column if not exists following_count integer default 0;

notify pgrst, 'reload schema';
