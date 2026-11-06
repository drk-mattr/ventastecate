-- ============================================================
-- Messaging v2, Step 5: email notification preference.
--
-- Adds profiles.email_message_notifications (boolean, default
-- true): the recipient's on/off switch for new-message emails.
-- Default ON — existing users are never silently unsubscribed.
--
-- The send route (app/api/send-message-notification) checks this
-- column and skips the email when it is false. In-app
-- notifications (the bell, migration 018) are untouched: this
-- setting governs email only.
--
-- Guarded/idempotent style (prod lineage differs from schema.sql):
-- the column is added with IF NOT EXISTS, and the file ends with
-- `notify pgrst, 'reload schema'`. Run in the Supabase SQL editor.
-- App code degrades gracefully pre-033: the send route treats a
-- missing column as "enabled" (fail open — never silently drop
-- notifications), and the profile toggle shows the migration
-- message instead of crashing.
-- ============================================================

alter table public.profiles
  add column if not exists email_message_notifications boolean not null default true;

comment on column public.profiles.email_message_notifications is
  'Email on/off for new-message notifications. True (default) = send the email. False = skip it. In-app notifications (bell) are unaffected.';

notify pgrst, 'reload schema';
