-- 052_border_dynamics.sql
-- La Garita dynamic details (2026-11-09): pace + tail marker on
-- community reports. Both nullable: old reports have neither, new
-- reports may skip either. No backfill — nothing to backfill from.
-- The fixed sets are the point: only a closed set aggregates.
-- Adding a landmark later = a tiny migration altering the check.
-- Landmarks confirmed by Greg 2026-11-09 (port → town order):
-- Garita → Glorieta → CETIS → Panteón → El Alto; El Alto is one
-- landmark label, the way people say "está por El Alto".

alter table public.border_line_reports
  add column if not exists pace text
    check (pace is null or pace in ('rapida', 'normal', 'lenta'));

alter table public.border_line_reports
  add column if not exists tail_marker text
    check (tail_marker is null or tail_marker in
      ('garita', 'glorieta', 'cetis', 'panteon', 'el_alto'));
