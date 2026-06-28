-- ============================================================
-- Security hardening: messages UPDATE + conversations INSERT.
--
-- Two RLS gaps closed here (see review):
--
-- 1. messages UPDATE: the prior policy gated only on conversation
--    membership, with no WITH CHECK and no sender restriction. That let
--    EITHER participant overwrite the OTHER person's message content
--    (e.g. a buyer rewriting a seller's agreed price). The only legitimate
--    update path is the recipient marking messages read, so we:
--      - restrict the row (USING/WITH CHECK) to the NON-sender participant, and
--      - restrict the columns to `read` only via column-level privileges,
--        so content / sender_id can never be changed by a client.
--
-- 2. conversations INSERT: the prior policy only checked buyer_id = auth.uid().
--    The client supplies seller_id freely (from a ?seller= query param), so a
--    user could attach an arbitrary person to a thread on a real listing and
--    trigger an email to them. We now require seller_id to actually own the
--    referenced listing, and buyer != seller.
-- ============================================================

-- ---------- messages: read-receipt-only UPDATE ----------

-- Drop every known prior name for the messages UPDATE policy (schema lineage
-- differs between the canonical schema.sql and production — be defensive).
drop policy if exists "Users can update their own messages" on public.messages;
drop policy if exists messages_conversation_update on public.messages;

create policy messages_mark_read on public.messages
  for update
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Column-level lockdown: clients (authenticated role) may only UPDATE the
-- `read` flag. This makes it impossible to mutate content/sender_id even if a
-- future policy is loosened. INSERT/SELECT/DELETE privileges are unaffected.
revoke update on public.messages from authenticated;
grant update (read) on public.messages to authenticated;

-- ---------- conversations: validate seller_id owns the listing ----------

drop policy if exists "Authenticated users can create conversations" on public.conversations;
drop policy if exists conversations_auth_insert on public.conversations;

create policy conversations_insert_valid on public.conversations
  for insert
  with check (
    auth.uid() = buyer_id
    and buyer_id <> seller_id
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.user_id = seller_id
    )
  );

notify pgrst, 'reload schema';
