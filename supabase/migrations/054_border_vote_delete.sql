-- 054_border_vote_delete.sql
--
-- La Garita like button (2026-11-10): the "¿Sigue así?" vote row
-- became a single like toggle. Liking posts a 'confirma' vote
-- through the existing POST /api/border/confirm; unliking deletes
-- the user's own row from border_line_votes via the Supabase
-- browser client. Migration 049 granted that table insert + select
-- policies only, so the unlike tap had no delete policy and would
-- fail (the UI reverts the optimistic update, so it never showed
-- a wrong state — but the toggle only worked one way).
--
-- This adds the one missing policy: an authenticated user can
-- delete ONLY their own vote row. Nothing else changes; the
-- confirm endpoint and the estimate logic are untouched.
create policy "Users can remove their own border vote"
  on public.border_line_votes for delete to authenticated
  using (auth.uid() = user_id);
