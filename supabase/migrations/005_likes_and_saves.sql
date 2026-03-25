-- ============================================================
-- Likes & Saves: Social engagement layer
-- ============================================================

-- Likes table
create table public.listing_likes (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(listing_id, user_id)
);

-- Saves / bookmarks table
create table public.listing_saves (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(listing_id, user_id)
);

-- Denormalized counters on listings for fast reads
alter table public.listings
  add column likes_count integer not null default 0,
  add column saves_count integer not null default 0,
  add column comments_count integer not null default 0;

-- Indexes
create index listing_likes_listing_id_idx on public.listing_likes(listing_id);
create index listing_likes_user_id_idx on public.listing_likes(user_id);
create index listing_saves_listing_id_idx on public.listing_saves(listing_id);
create index listing_saves_user_id_idx on public.listing_saves(user_id);

-- Enable RLS
alter table public.listing_likes enable row level security;
alter table public.listing_saves enable row level security;

-- RLS: Anyone can see likes/saves (for counts)
create policy "Likes are viewable by everyone"
  on public.listing_likes for select
  using (true);

create policy "Saves are viewable by everyone"
  on public.listing_saves for select
  using (true);

-- RLS: Authenticated users can like/save
create policy "Users can like listings"
  on public.listing_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike listings"
  on public.listing_likes for delete
  using (auth.uid() = user_id);

create policy "Users can save listings"
  on public.listing_saves for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave listings"
  on public.listing_saves for delete
  using (auth.uid() = user_id);

-- Trigger: Auto-increment/decrement likes_count
create or replace function public.handle_likes_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.listings set likes_count = likes_count + 1 where id = NEW.listing_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.listings set likes_count = greatest(likes_count - 1, 0) where id = OLD.listing_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_like_change
  after insert or delete on public.listing_likes
  for each row execute procedure public.handle_likes_count();

-- Trigger: Auto-increment/decrement saves_count
create or replace function public.handle_saves_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.listings set saves_count = saves_count + 1 where id = NEW.listing_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.listings set saves_count = greatest(saves_count - 1, 0) where id = OLD.listing_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_save_change
  after insert or delete on public.listing_saves
  for each row execute procedure public.handle_saves_count();
