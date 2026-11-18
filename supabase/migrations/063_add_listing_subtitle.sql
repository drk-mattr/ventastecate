-- 063: AI-written subtitle (dek) for news articles.
--
-- The article dek used to be the first 200 characters of the body
-- (newsLede), so it read as a repeat of the opening sentence. An
-- AI-written subtitle is stored at post time instead: one tight
-- line about the story that does not restate the opening sentence.
-- The article shows it when present and falls back to the lede
-- when it is null, so old posts and form posts keep working.
alter table public.listings add column if not exists subtitle text;
notify pgrst, 'reload schema';
