-- ============================================================
-- Messaging v2, Step 1: server foundation.
--
-- Confirmed against the migration files (not just the audit):
--   (a) NO UPDATE policy exists on public.conversations anywhere
--       (schema.sql has SELECT + INSERT only; 017 adds an INSERT
--       policy and a messages read-only UPDATE policy). The client-side
--       `.update({ updated_at })` in app/messages/page.tsx sendMessage
--       is therefore denied by RLS and the list never re-orders.
--       Fix: a trigger bumps updated_at when a message arrives.
--   (b) Migration 018 has like/comment/follow notification triggers
--       only — NO message trigger, so the bell is dead for messages.
--       Fix: a message notification trigger, same pattern as 018.
--   (c) Migration 007's on_conversation_ranking trigger increments
--       listings.conversation_count on conversation INSERT, so an
--       empty thread created by a Contactar click already counts x4
--       toward ranking_score. Fix: count only conversations that
--       have at least 1 message — increment on the FIRST message,
--       decrement when the last message is deleted.
--
-- Defensive style: prod schema lineage differs from schema.sql, so
-- every object is dropped/created with IF EXISTS guards, and the
-- notification trigger is only created when the notifications table
-- (from 018) actually exists. Run in the Supabase SQL editor.
-- ============================================================

-- ---------- (a) bump conversations.updated_at on new message ----------

create or replace function public.touch_conversation_on_message()
returns trigger as $$
begin
  -- Legacy rows may carry thread_id instead of conversation_id.
  if new.conversation_id is null then
    return new;
  end if;
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_touch_conversation on public.messages;
create trigger on_message_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- ---------- (b) notify the other participant on new message ----------
-- Same shape as the notify_like / notify_comment / notify_follow
-- functions in 018: security definer, recipient-only RLS on the
-- notifications table, no self-notifications.

create or replace function public.notify_message()
returns trigger as $$
declare
  v_buyer_id uuid;
  v_seller_id uuid;
  v_listing_id uuid;
  v_recipient_id uuid;
begin
  if new.conversation_id is null then
    return new;
  end if;

  select buyer_id, seller_id, listing_id
    into v_buyer_id, v_seller_id, v_listing_id
  from public.conversations
  where id = new.conversation_id;

  if v_buyer_id is null then
    return new;
  end if;

  v_recipient_id := case
    when new.sender_id = v_buyer_id then v_seller_id
    else v_buyer_id
  end;

  if v_recipient_id is not null and v_recipient_id <> new.sender_id then
    insert into public.notifications (recipient_id, actor_id, type, listing_id)
    values (v_recipient_id, new.sender_id, 'message', v_listing_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Only wire the trigger when 018's notifications table exists.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'notifications'
  ) then
    execute 'drop trigger if exists on_message_notify on public.messages';
    execute 'create trigger on_message_notify after insert on public.messages for each row execute function public.notify_message()';
  end if;
end $$;

-- ---------- (c) ranking: count conversations only once they have a message ----------

-- Retire the 007 trigger that counted empty threads on INSERT.
drop trigger if exists on_conversation_ranking on public.conversations;
drop function if exists public.trigger_ranking_on_conversation();

create or replace function public.trigger_ranking_on_first_message()
returns trigger as $$
declare
  v_listing_id uuid;
  v_message_count integer;
begin
  if new.conversation_id is null then
    return new;
  end if;

  -- Lock the conversation row so two simultaneous first messages
  -- in the same thread cannot both count.
  select listing_id into v_listing_id
  from public.conversations
  where id = new.conversation_id
  for update;

  if v_listing_id is null then
    return new;
  end if;

  select count(*) into v_message_count
  from public.messages
  where conversation_id = new.conversation_id;

  if v_message_count = 1 then
    update public.listings
    set conversation_count = conversation_count + 1
    where id = v_listing_id;
    perform public.refresh_listing_ranking(v_listing_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_first_message_ranking on public.messages;
create trigger on_first_message_ranking
  after insert on public.messages
  for each row execute function public.trigger_ranking_on_first_message();

-- Keep the invariant under deletes: if the last message of a thread
-- is removed, the thread stops counting toward the listing.
create or replace function public.trigger_ranking_on_message_delete()
returns trigger as $$
declare
  v_listing_id uuid;
  v_remaining integer;
begin
  if old.conversation_id is null then
    return old;
  end if;

  select listing_id into v_listing_id
  from public.conversations
  where id = old.conversation_id;

  if v_listing_id is null then
    return old;
  end if;

  select count(*) into v_remaining
  from public.messages
  where conversation_id = old.conversation_id;

  if v_remaining = 0 then
    update public.listings
    set conversation_count = greatest(conversation_count - 1, 0)
    where id = v_listing_id;
    perform public.refresh_listing_ranking(v_listing_id);
  end if;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_delete_ranking on public.messages;
create trigger on_message_delete_ranking
  after delete on public.messages
  for each row execute function public.trigger_ranking_on_message_delete();

-- ---------- backfill: recount from threads that actually have messages ----------

update public.listings l
set conversation_count = (
  select count(*)
  from public.conversations c
  where c.listing_id = l.id
    and exists (
      select 1 from public.messages m where m.conversation_id = c.id
    )
);

-- Recompute scores from the corrected counts (007's function).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'refresh_all_rankings') then
    perform public.refresh_all_rankings();
  end if;
end $$;

notify pgrst, 'reload schema';
