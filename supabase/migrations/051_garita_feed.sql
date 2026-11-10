-- 051_garita_feed.sql
-- La Garita feed (2026-11-09): moderator hide for border posts +
-- target column so border flags land in the /admin/reports inbox.
-- A single report never auto-hides anything: hidden_at is set only
-- by the border-moderate routes (hide/restore, reason required,
-- logged). Feed + estimate queries exclude hidden rows (code-side).
--
-- moderation_log gains a border target so border hides are logged
-- in the same audit table as listing hides; listing_id becomes
-- nullable because a border hide has no listing. Existing rows all
-- keep their listing_id.

alter table public.border_line_reports
  add column if not exists hidden_at timestamptz;

alter table public.reports
  add column if not exists border_report_id uuid
    references public.border_line_reports(id) on delete set null;

alter table public.moderation_log
  add column if not exists border_report_id uuid
    references public.border_line_reports(id) on delete set null;

alter table public.moderation_log
  alter column listing_id drop not null;
