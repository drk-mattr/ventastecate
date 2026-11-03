-- Notifications, ready to apply in the Supabase SQL editor.
-- NOT yet applied to the live database: the in-app bell (v1) is built on
-- the existing listing_likes / listing_comments / follows tables so it
-- works today. Apply this migration when persistent, server-side read
-- state is wanted, then switch the bell to read from this table.
-- RLS: a user reads only notifications addressed to them.
-- No self-notifications: triggers skip actions by the listing owner.

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'follow', 'message')),
  listing_id uuid references public.listings(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz default now() not null
);

create index if not exists notifications_recipient_idx on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(recipient_id) where read = false;

alter table public.notifications enable row level security;

drop policy if exists "Recipients read own notifications" on public.notifications;
create policy "Recipients read own notifications"
  on public.notifications for select using (auth.uid() = recipient_id);

drop policy if exists "Recipients update own notifications" on public.notifications;
create policy "Recipients update own notifications"
  on public.notifications for update using (auth.uid() = recipient_id);

create or replace function public.notify_like()
returns trigger as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.listings where id = new.listing_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, listing_id)
    values (owner_id, new.user_id, 'like', new.listing_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_like_notify on public.listing_likes;
create trigger on_like_notify after insert on public.listing_likes
  for each row execute function public.notify_like();

create or replace function public.notify_comment()
returns trigger as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.listings where id = new.listing_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, listing_id)
    values (owner_id, new.user_id, 'comment', new.listing_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_notify on public.listing_comments;
create trigger on_comment_notify after insert on public.listing_comments
  for each row execute function public.notify_comment();

create or replace function public.notify_follow()
returns trigger as $$
begin
  if new.following_id <> new.follower_id then
    insert into public.notifications (recipient_id, actor_id, type)
    values (new.following_id, new.follower_id, 'follow');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_follow_notify on public.follows;
create trigger on_follow_notify after insert on public.follows
  for each row execute function public.notify_follow();
