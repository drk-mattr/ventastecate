-- Copy the OAuth avatar into the new profile on signup (e.g. Facebook
-- public_profile picture, which Supabase stores as avatar_url in
-- raw_user_meta_data). Without this, Facebook logins created a profile
-- with no avatar and the site showed the initial-letter fallback.
-- Apply in the Supabase SQL editor, like 018/019/020. No code deploy
-- is needed for this change: it only affects the database trigger.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'display_name',
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  );
  return new;
end;
$$ language plpgsql security definer;

-- Backfill profiles that were created before this fix and still have
-- no avatar, where the auth record already has one.
update public.profiles p
set avatar_url = coalesce(
  u.raw_user_meta_data->>'avatar_url',
  u.raw_user_meta_data->>'picture'
)
from auth.users u
where p.id = u.id
  and p.avatar_url is null
  and coalesce(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  ) is not null;
