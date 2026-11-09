-- 047_profiles_privilege_guard.sql
--
-- SEC1 (2026-11-09): the profiles UPDATE policy is
-- `using (auth.uid() = id)` with no column restriction, so any
-- signed-in user could set is_superadmin = true on their own row
-- (and fake the follow counters) with the anon key. This BEFORE
-- UPDATE trigger blocks changes to the privileged columns unless
-- the caller is the service role.
--
-- Two deliberate choices:
-- 1. `auth.role() IS DISTINCT FROM 'service_role'` (not `<>`):
--    direct SQL sessions (dashboard / SQL editor, no JWT) report
--    auth.role() as NULL, and NULL <> 'service_role' is NULL, i.e.
--    the guard would silently not fire there. IS DISTINCT FROM
--    treats "no JWT" as "not the service role", so the guard fires
--    in those sessions too. Consequence: counter backfills must go
--    through the service-role client, not raw SQL.
-- 2. `pg_trigger_depth() > 1` exempts nested updates: the
--    follow-count trigger update_follow_counts() (AFTER INSERT OR
--    DELETE on follows) runs as SECURITY INVOKER, so its UPDATEs on
--    profiles arrive with role 'authenticated' — the naive guard
--    would break following entirely. A direct user UPDATE always
--    fires this guard at depth 1; an UPDATE issued by another
--    trigger fires it at depth 2+. Only server-side triggers can
--    produce depth > 1 (app users cannot create triggers), so the
--    exemption is safe.
-- INSERT needs no guard: profiles rows are created by the
-- handle_new_user() trigger on auth.users (SECURITY DEFINER), and
-- the INSERT policy only allows a row whose id is the caller's own
-- uid, so there is no path to insert a privileged row.

CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Updates issued by another trigger (the follow-count trigger) are
  -- server-side bookkeeping, not a user edit: let them through.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF (OLD.is_superadmin IS DISTINCT FROM NEW.is_superadmin
      OR OLD.followers_count IS DISTINCT FROM NEW.followers_count
      OR OLD.following_count IS DISTINCT FROM NEW.following_count)
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'profiles: is_superadmin, followers_count and following_count may only be changed by the service role';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_privilege_guard ON public.profiles;
CREATE TRIGGER profiles_privilege_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profiles_privileged_columns();
