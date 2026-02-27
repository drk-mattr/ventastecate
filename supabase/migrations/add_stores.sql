-- Migration: Add stores feature
-- Run this in the Supabase SQL Editor

-- 1. Create stores table
create table public.stores (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  slug text unique not null,
  name text not null,
  description text,
  avatar_url text,
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint slug_length check (char_length(slug) >= 3 and char_length(slug) <= 40),
  constraint slug_format check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

-- 2. Add store_id to listings
alter table public.listings
  add column store_id uuid references public.stores(id) on delete set null;

-- 3. Indexes
create index stores_owner_id_idx on public.stores(owner_id);
create index stores_slug_idx on public.stores(slug);
create index listings_store_id_idx on public.listings(store_id);

-- 4. Enable RLS
alter table public.stores enable row level security;

-- 5. RLS Policies for stores
create policy "Stores are viewable by everyone"
  on public.stores for select
  using (true);

create policy "Users can create their own stores"
  on public.stores for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own stores"
  on public.stores for update
  using (auth.uid() = owner_id);

create policy "Users can delete their own stores"
  on public.stores for delete
  using (auth.uid() = owner_id);

-- 6. Updated_at trigger
create trigger handle_stores_updated_at
  before update on public.stores
  for each row execute procedure public.handle_updated_at();

-- 7. Storage bucket for store avatars
insert into storage.buckets (id, name, public)
values ('store-avatars', 'store-avatars', true);

-- 8. Storage policies for store avatars
create policy "Anyone can view store avatars"
  on storage.objects for select
  using (bucket_id = 'store-avatars');

create policy "Authenticated users can upload store avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'store-avatars'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own store avatar"
  on storage.objects for update
  using (
    bucket_id = 'store-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own store avatar"
  on storage.objects for delete
  using (
    bucket_id = 'store-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
