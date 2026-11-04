-- Fix Facebook (OAuth) signup failing on callback with
-- error=auth_callback_failed / unexpected_failure.
--
-- Root cause: handle_new_user inserted username and display_name
-- verbatim from raw_user_meta_data. Email signups pass those fields,
-- but Facebook sends full_name/name/email/avatar_url instead, so the
-- insert put NULL into profiles.username/display_name (both NOT NULL)
-- and Supabase aborted the signup.
--
-- This version derives display_name from display_name/full_name/name/
-- email prefix, and derives a unique, format-valid username from the
-- metadata username, email prefix, or display name, with a hash suffix
-- on collision. It keeps the 021 avatar copy.
--
-- Apply in the Supabase SQL editor, then retry Facebook login. No
-- Worker deploy is needed: this only changes the database trigger.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  disp text;
  base_username text;
  candidate text;
  i int := 0;
begin
  -- Email signups pass username/display_name in metadata. OAuth
  -- (Facebook) does not: it sends full_name/name/email/avatar_url.
  -- The old trigger inserted username/display_name verbatim, so an
  -- OAuth signup inserted NULL into NOT NULL columns and the whole
  -- signup failed with Supabase's unexpected_failure on callback.
  disp := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Usuario'
  );
  base_username := lower(regexp_replace(coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    disp,
    'usuario'
  ), '[^a-zA-Z0-9_]', '', 'g'));
  if base_username = '' then base_username := 'usuario'; end if;
  base_username := substr(base_username, 1, 20);
  if char_length(base_username) < 3 then
    base_username := substr(base_username || '123', 1, 20);
  end if;
  candidate := base_username;
  while exists (select 1 from public.profiles where username = candidate) loop
    i := i + 1;
    candidate := substr(base_username, 1, 15) || '_' || substr(md5(new.id::text || i::text), 1, 4);
  end loop;
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate,
    disp,
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  );
  return new;
end;
$$ language plpgsql security definer;
