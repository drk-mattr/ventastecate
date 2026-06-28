-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint username_length check (char_length(username) >= 3 and char_length(username) <= 20),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

-- Create stores table
create table public.stores (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  slug text unique not null,
  name text not null,
  store_type text not null default 'general' check (store_type in ('general', 'real_estate', 'automotive')),
  description text,
  avatar_url text,
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint slug_length check (char_length(slug) >= 3 and char_length(slug) <= 40),
  constraint slug_format check (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

-- Create listings table
create table public.listings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  store_id uuid references public.stores(id) on delete set null,
  title text not null,
  description text not null,
  price numeric(10, 2) not null check (price >= 0),
  category text not null,
  location text not null,
  metadata jsonb,
  status text not null default 'active' check (status in ('active', 'sold', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create listing_images table
create table public.listing_images (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  image_url text not null,
  order_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create conversations table
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint different_users check (buyer_id != seller_id),
  unique(listing_id, buyer_id, seller_id)
);

-- Create messages table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  read boolean default false not null
);

-- Create indexes for better performance
create index stores_owner_id_idx on public.stores(owner_id);
create index stores_slug_idx on public.stores(slug);
create index listings_user_id_idx on public.listings(user_id);
create index listings_store_id_idx on public.listings(store_id);
create index listings_status_idx on public.listings(status);
create index listings_category_idx on public.listings(category);
create index listings_created_at_idx on public.listings(created_at desc);
create index listing_images_listing_id_idx on public.listing_images(listing_id);
create index conversations_buyer_id_idx on public.conversations(buyer_id);
create index conversations_seller_id_idx on public.conversations(seller_id);
create index messages_conversation_id_idx on public.messages(conversation_id);
create index messages_created_at_idx on public.messages(created_at);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Profiles RLS Policies
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Stores RLS Policies
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

-- Listings RLS Policies
create policy "Listings are viewable by everyone"
  on public.listings for select
  using (true);

create policy "Authenticated users can create listings"
  on public.listings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own listings"
  on public.listings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own listings"
  on public.listings for delete
  using (auth.uid() = user_id);

-- Listing Images RLS Policies
create policy "Listing images are viewable by everyone"
  on public.listing_images for select
  using (true);

create policy "Users can insert images for their own listings"
  on public.listing_images for insert
  with check (
    exists (
      select 1 from public.listings
      where id = listing_id and user_id = auth.uid()
    )
  );

create policy "Users can delete images from their own listings"
  on public.listing_images for delete
  using (
    exists (
      select 1 from public.listings
      where id = listing_id and user_id = auth.uid()
    )
  );

-- Conversations RLS Policies
create policy "Users can view their own conversations"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- INSERT requires the seller to actually own the referenced listing, so a
-- client can't attach an arbitrary user to a thread (and trigger emails to them).
create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (
    auth.uid() = buyer_id
    and buyer_id <> seller_id
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.user_id = seller_id
    )
  );

-- Messages RLS Policies
create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where id = conversation_id
      and (buyer_id = auth.uid() or seller_id = auth.uid())
    )
  );

create policy "Users can send messages in their conversations"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations
      where id = conversation_id
      and (buyer_id = auth.uid() or seller_id = auth.uid())
    )
    and sender_id = auth.uid()
  );

-- The only legitimate UPDATE is the recipient marking messages read. Restrict
-- to the non-sender participant, and (via column privileges below) to the
-- `read` column only — so message content/sender_id can never be tampered with.
create policy "Users can update their own messages"
  on public.messages for update
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations
      where id = conversation_id
      and (buyer_id = auth.uid() or seller_id = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations
      where id = conversation_id
      and (buyer_id = auth.uid() or seller_id = auth.uid())
    )
  );

-- Clients may only ever update the `read` flag.
revoke update on public.messages from authenticated;
grant update (read) on public.messages to authenticated;

-- Create a function to automatically create a profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'display_name'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_stores_updated_at
  before update on public.stores
  for each row execute procedure public.handle_updated_at();

create trigger handle_listings_updated_at
  before update on public.listings
  for each row execute procedure public.handle_updated_at();

create trigger handle_conversations_updated_at
  before update on public.conversations
  for each row execute procedure public.handle_updated_at();

-- Create storage bucket for listing images
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true);

-- Create storage bucket for user avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Create storage bucket for store avatars
insert into storage.buckets (id, name, public)
values ('store-avatars', 'store-avatars', true);

-- Storage policies for listing images
create policy "Anyone can view listing images"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "Authenticated users can upload listing images"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and auth.role() = 'authenticated'
  );

create policy "Users can update their own images"
  on storage.objects for update
  using (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own images"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for avatars
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for store avatars
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
