-- ============================================================
-- Messaging v2, Step 4: safety + abuse controls.
--
-- Four pieces:
--   (a) ARCHIVE (per-participant): archived_by_buyer /
--       archived_by_seller on conversations. Archiving hides the
--       thread from one participant's list only; the other side is
--       unaffected. No UPDATE policy exists on conversations (see
--       028), so archive/unarchive goes through a server route with
--       the service-role client, never client-direct.
--   (b) BLOCK: user_blocks (blocker_id, blocked_id). Blocking hides
--       the thread for the blocker and must stop the blocked user
--       from starting a new thread OR sending in an existing one.
--       Enforcement is server-side in the database, because the
--       composer inserts client-direct: BEFORE INSERT triggers on
--       messages and on conversations raise when either participant
--       has blocked the other. Blocking never deletes history.
--   (c) REPORT: reports.conversation_id links a message report to
--       its thread (reports table + /admin/reports inbox from 023).
--       Reporting hides or blocks nothing by itself.
--   (d) RATE LIMIT: BEFORE INSERT trigger on messages caps sends
--       per user — 10 messages per minute, 100 per hour. The
--       composer maps the trigger error to a message and keeps the
--       draft text, so a limited send is never silently eaten.
--
-- Defensive style (prod lineage differs from schema.sql): every
-- object is created with IF EXISTS / IF NOT EXISTS guards, and the
-- file ends with `notify pgrst, 'reload schema'`. Run in the
-- Supabase SQL editor. App code degrades gracefully pre-031 (see
-- the routes): archive/block/report return 503 migration_pending
-- and the list treats missing columns/tables as "nothing archived,
-- nobody blocked".
-- ============================================================

-- ---------- (a) per-participant archive flags ----------

alter table public.conversations
  add column if not exists archived_by_buyer boolean not null default false;

alter table public.conversations
  add column if not exists archived_by_seller boolean not null default false;

-- ---------- (b) blocks ----------

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_id);

-- No permissive policies: all block reads/writes go through server
-- routes with the service-role client (the app never reads this
-- table client-direct). Trigger functions below are security
-- definer, so they bypass RLS. Enabling RLS with no policies means
-- the authenticated role gets nothing by default.
alter table public.user_blocks enable row level security;

-- ---------- (c) report linkage ----------

alter table public.reports
  add column if not exists conversation_id uuid
    references public.conversations(id) on delete set null;

create index if not exists reports_conversation_idx
  on public.reports (conversation_id);

-- ---------- (d) rate-limit support ----------

create index if not exists messages_sender_created_idx
  on public.messages (sender_id, created_at desc);

-- ---------- trigger: block on message send ----------
-- Either direction blocks the send: if A blocked B, neither A nor
-- B can message in their shared threads. Legacy rows may carry a
-- null conversation_id — those pass through untouched.

create or replace function public.check_message_blocked()
returns trigger as $$
declare
  v_buyer_id uuid;
  v_seller_id uuid;
  v_other_id uuid;
begin
  if new.conversation_id is null then
    return new;
  end if;

  select buyer_id, seller_id
    into v_buyer_id, v_seller_id
  from public.conversations
  where id = new.conversation_id;

  if v_buyer_id is null then
    return new;
  end if;

  v_other_id := case
    when new.sender_id = v_buyer_id then v_seller_id
    else v_buyer_id
  end;

  if exists (
    select 1 from public.user_blocks
    where (blocker_id = new.sender_id and blocked_id = v_other_id)
       or (blocker_id = v_other_id and blocked_id = new.sender_id)
  ) then
    raise exception 'MESSAGE_BLOCKED';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_check_blocked on public.messages;
create trigger on_message_check_blocked
  before insert on public.messages
  for each row execute function public.check_message_blocked();

-- ---------- trigger: block on thread creation ----------
-- Stops the blocked user from starting a new thread with the
-- blocker (the composer would otherwise create the row, then fail
-- only on the first message).

create or replace function public.check_conversation_blocked()
returns trigger as $$
begin
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = new.buyer_id and blocked_id = new.seller_id)
       or (blocker_id = new.seller_id and blocked_id = new.buyer_id)
  ) then
    raise exception 'CONVERSATION_BLOCKED';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_conversation_check_blocked on public.conversations;
create trigger on_conversation_check_blocked
  before insert on public.conversations
  for each row execute function public.check_conversation_blocked();

-- ---------- trigger: per-user send rate limit ----------
-- 10 messages per rolling minute, 100 per rolling hour. Counts
-- only rows that already exist (BEFORE INSERT), so the 11th send
-- inside a minute is the one rejected.

create or replace function public.check_message_rate_limit()
returns trigger as $$
declare
  v_last_minute integer;
  v_last_hour integer;
begin
  select count(*) into v_last_minute
  from public.messages
  where sender_id = new.sender_id
    and created_at > now() - interval '1 minute';

  if v_last_minute >= 10 then
    raise exception 'MESSAGE_RATE_LIMITED';
  end if;

  select count(*) into v_last_hour
  from public.messages
  where sender_id = new.sender_id
    and created_at > now() - interval '1 hour';

  if v_last_hour >= 100 then
    raise exception 'MESSAGE_RATE_LIMITED';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_check_rate_limit on public.messages;
create trigger on_message_check_rate_limit
  before insert on public.messages
  for each row execute function public.check_message_rate_limit();

notify pgrst, 'reload schema';
