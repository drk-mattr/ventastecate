-- 045_stories_text.sql
--
-- Stories text (caption): an optional short text overlay on a story
-- photo — typed text including emojis, rendered over the image in the
-- viewer (white text on a dark chip). Cap 140 characters, enforced
-- here and in the API + form. Nullable: existing stories simply have
-- no text, and the viewer renders nothing for them.

alter table public.stories
  add column if not exists caption text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stories_caption_max_length'
  ) then
    alter table public.stories
      add constraint stories_caption_max_length
      check (caption is null or char_length(caption) <= 140);
  end if;
end $$;

notify pgrst, 'reload schema';
