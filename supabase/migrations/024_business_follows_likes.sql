-- Business follows + likes: businesses are index entities, not profiles, so
-- they need their own tables (follows.following_id references profiles only).
create table if not exists public.business_follows (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamp with time zone default now() not null,
  unique(user_id, business_id)
);
create table if not exists public.business_likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamp with time zone default now() not null,
  unique(user_id, business_id)
);
alter table public.businesses add column if not exists followers_count integer not null default 0;
alter table public.businesses add column if not exists likes_count integer not null default 0;
create index if not exists business_follows_business_idx on public.business_follows(business_id);
create index if not exists business_follows_user_idx on public.business_follows(user_id);
create index if not exists business_likes_business_idx on public.business_likes(business_id);
create index if not exists business_likes_user_idx on public.business_likes(user_id);

alter table public.business_follows enable row level security;
alter table public.business_likes enable row level security;
create policy "Business follows viewable by everyone" on public.business_follows for select using (true);
create policy "Business likes viewable by everyone" on public.business_likes for select using (true);
create policy "Users can follow businesses" on public.business_follows for insert with check (auth.uid() = user_id);
create policy "Users can unfollow businesses" on public.business_follows for delete using (auth.uid() = user_id);
create policy "Users can like businesses" on public.business_likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike businesses" on public.business_likes for delete using (auth.uid() = user_id);

create or replace function public.handle_business_follow_count() returns trigger as $$
begin
  if (TG_OP = 'INSERT') then update public.businesses set followers_count = followers_count + 1 where id = NEW.business_id; return NEW;
  elsif (TG_OP = 'DELETE') then update public.businesses set followers_count = greatest(followers_count - 1, 0) where id = OLD.business_id; return OLD; end if;
  return null;
end; $$ language plpgsql security definer;
create or replace function public.handle_business_like_count() returns trigger as $$
begin
  if (TG_OP = 'INSERT') then update public.businesses set likes_count = likes_count + 1 where id = NEW.business_id; return NEW;
  elsif (TG_OP = 'DELETE') then update public.businesses set likes_count = greatest(likes_count - 1, 0) where id = OLD.business_id; return OLD; end if;
  return null;
end; $$ language plpgsql security definer;
drop trigger if exists on_business_follow_change on public.business_follows;
create trigger on_business_follow_change after insert or delete on public.business_follows for each row execute procedure public.handle_business_follow_count();
drop trigger if exists on_business_like_change on public.business_likes;
create trigger on_business_like_change after insert or delete on public.business_likes for each row execute procedure public.handle_business_like_count();
