-- Store follows: stores are posting identities, not profiles, so
-- they need their own table (follows.following_id references
-- profiles only). Follows the business_follows pattern from
-- migration 024: same shape, same RLS, same counter trigger.

create table if not exists public.store_follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamp with time zone default now() not null,
  unique(follower_id, store_id)
);
alter table public.stores add column if not exists followers_count integer not null default 0;
create index if not exists store_follows_store_idx on public.store_follows(store_id);
create index if not exists store_follows_follower_idx on public.store_follows(follower_id);

alter table public.store_follows enable row level security;
create policy "Store follows viewable by everyone" on public.store_follows for select using (true);
create policy "Users can follow stores" on public.store_follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow stores" on public.store_follows for delete using (auth.uid() = follower_id);

create or replace function public.handle_store_follow_count() returns trigger as $$
begin
  if (TG_OP = 'INSERT') then update public.stores set followers_count = followers_count + 1 where id = NEW.store_id; return NEW;
  elsif (TG_OP = 'DELETE') then update public.stores set followers_count = greatest(followers_count - 1, 0) where id = OLD.store_id; return OLD; end if;
  return null;
end; $$ language plpgsql security definer;
drop trigger if exists on_store_follow_change on public.store_follows;
create trigger on_store_follow_change after insert or delete on public.store_follows for each row execute procedure public.handle_store_follow_count();
