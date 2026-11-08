-- 046_stories_overlays.sql
--
-- Stories placeable overlays: text/emoji stickers placed on the photo.
-- One JSONB column on stories (array, max 5 overlays). Overlays are
-- intrinsic to one story — they die with it after 24h, are never
-- queried independently, and number <= 5 — so a separate table would
-- add a join, its own RLS policies, and an extra insert path for zero
-- benefit. Nullable: old stories have overlays = null and render
-- exactly as today (caption chip, migration 045).
--
-- One overlay (positions are fractions of the photo's displayed size,
-- center-anchored):
--   { "id": "o1", "kind": "text", "text": "¡Hoy 2x1! 🌮",
--     "x": 0.5, "y": 0.35, "scale": 1.4, "rotation": -6 }
-- x / y: 0–1, fraction of the displayed photo, center of the overlay.
-- scale: multiplier on a base font size, clamp 0.5–3.
-- rotation: degrees, clamp -180–180. text: <= 60 chars per overlay.
-- The API + form validate each overlay's shape; the DB only enforces
-- the array cap (per-overlay shape checks in SQL would be brittle).

alter table public.stories
  add column if not exists overlays jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stories_overlays_max_items'
  ) then
    alter table public.stories
      add constraint stories_overlays_max_items
      check (overlays is null or (jsonb_typeof(overlays) = 'array' and jsonb_array_length(overlays) <= 5));
  end if;
end $$;

notify pgrst, 'reload schema';
