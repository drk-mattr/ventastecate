-- 050_video_news.sql
--
-- Video en Noticias y avisos + the local newscaster kit (proposal
-- 2026-11-09). One native clip per news post (<=60s, <=50MB) in a new
-- public `listing-videos` bucket, uploaded with the TUS resumable
-- path (the installed supabase-js 2.97.0 does NOT expose resumable
-- uploads — the client uses tus-js-client directly against the
-- storage TUS endpoint, proven live 2026-11-09: a 40 MB upload
-- survived a simulated drop and resumed to completion).
--
-- Project plan (verified 2026-11-09 via the Management API — org
-- "dark matter systems", plan "free"): the 50 MB cap sits exactly at
-- the Free per-file ceiling; 1 GB storage and 5 GB egress bind fast
-- if video takes off. The caps are the cost control; Cloudflare
-- Stream is the P1 upgrade when a video passes ~1,000 views/day or
-- monthly egress crosses 200 GB.
--
-- Written with the video PR, NOT applied by the build agent. Apply
-- with sb.py at go-time, then verify:
--   select column_name from information_schema.columns
--     where table_name in ('listings','profiles')
--       and column_name in ('video_storage_path','video_duration_seconds',
--       'video_thumbnail_url','is_local_reporter');
--   select id, name, public, file_size_limit from storage.buckets
--     where id = 'listing-videos';
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--     where conrelid = 'public.notifications'::regclass and contype = 'c';

-- ── 1. Columns on listings: one native video per post, so columns
-- beat a table. video_url stays for links. A post has either a
-- native video or a link, never both (enforced in validation).
alter table public.listings
  add column if not exists video_storage_path text;
alter table public.listings
  add column if not exists video_duration_seconds int;
alter table public.listings
  add column if not exists video_thumbnail_url text;

-- ── 2. Reporter badge flag on profiles. Earned, not bought: set by
-- the trigger below at the author's 3rd live news post, revoked
-- when the live count drops below 3 (hide/restore recomputes).
-- NOT added to the 047 privilege guard: only is_superadmin and the
-- follow counters are guarded; this flag is written by a SECURITY
-- DEFINER trigger, never by the client.
alter table public.profiles
  add column if not exists is_local_reporter boolean not null default false;

-- ── 3. Notifications: the type CHECK predates reporter_post.
-- Verified live 2026-11-09: constraint `notifications_type_check`
-- is ('like','comment','follow','message'). Rebuild it with the
-- new type added; nothing else changes.
alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('like', 'comment', 'follow', 'message', 'reporter_post'));

-- ── 4. Reporter badge trigger (follows the 018 notify_* pattern:
-- SECURITY DEFINER functions, so RLS on profiles/notifications
-- never blocks the server-side bookkeeping).
create or replace function public.recompute_reporter_badge(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set is_local_reporter = (
    select count(*) >= 3
    from public.listings
    where user_id = p_user_id
      and listing_type = 'news'
      and status = 'active'
  )
  where id = p_user_id;
end;
$$;

create or replace function public.on_listing_reporter_badge()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    -- Only news posts earn the badge.
    if new.listing_type = 'news' then
      perform public.recompute_reporter_badge(new.user_id);
    end if;
  elsif tg_op = 'UPDATE' then
    -- Hide/restore (status) and retyping (listing_type) both change
    -- the live news count, so both recompute. Anything else (title,
    -- price, video columns) leaves the badge alone.
    if (old.listing_type = 'news' or new.listing_type = 'news')
      and (old.status is distinct from new.status
        or old.listing_type is distinct from new.listing_type) then
      perform public.recompute_reporter_badge(new.user_id);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_listing_reporter_badge on public.listings;
create trigger on_listing_reporter_badge
  after insert or update on public.listings
  for each row execute function public.on_listing_reporter_badge();

-- ── 5. Follower notifications on news posts. New type
-- `reporter_post`: one row per follower (cap 500 per post, skip
-- self, news only — never products, so followers of a seller are
-- not spammed). Bell only in v1, no email.
create or replace function public.notify_reporter_post()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.listing_type <> 'news' then
    return new;
  end if;
  insert into public.notifications (recipient_id, actor_id, type, listing_id)
  select f.follower_id, new.user_id, 'reporter_post', new.id
  from public.follows f
  where f.following_id = new.user_id
    and f.follower_id <> new.user_id
  order by f.created_at desc
  limit 500;
  return new;
end;
$$;

drop trigger if exists on_news_reporter_post on public.listings;
create trigger on_news_reporter_post
  after insert on public.listings
  for each row execute function public.notify_reporter_post();

-- ── 6. Bucket `listing-videos` (public) + storage RLS. Same shape
-- as the store-avatars precedent (add_stores.sql): the bucket row
-- itself is inserted here, policies on storage.objects below.
-- Uploads go under the uploader's own folder
-- (`<user-id>/<listing-id>/...`), so the ownership check below is
-- the whole access rule.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-videos',
  'listing-videos',
  true,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do nothing;

drop policy if exists "Anyone can view listing videos" on storage.objects;
create policy "Anyone can view listing videos"
  on storage.objects for select
  using (bucket_id = 'listing-videos');

drop policy if exists "Authenticated users can upload listing videos" on storage.objects;
create policy "Authenticated users can upload listing videos"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-videos'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own listing videos" on storage.objects;
create policy "Users can update their own listing videos"
  on storage.objects for update
  using (
    bucket_id = 'listing-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own listing videos" on storage.objects;
create policy "Users can delete their own listing videos"
  on storage.objects for delete
  using (
    bucket_id = 'listing-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
