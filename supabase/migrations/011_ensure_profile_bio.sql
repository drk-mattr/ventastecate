-- ============================================================
-- Ensure the profiles.bio column exists.
--
-- The profile-edit form writes display_name / bio / avatar_url, and the
-- public profile page reads bio. display_name and avatar_url are well
-- established, but bio was never in a tracked migration. This is a
-- preemptive, idempotent safeguard against the same "column not found in
-- schema cache" failure that hit listings — it no-ops if bio already exists.
-- ============================================================

alter table public.profiles
  add column if not exists bio text;

notify pgrst, 'reload schema';
