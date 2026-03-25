-- ============================================================
-- Business Mentions: tag businesses in listings
-- + Food/Restaurant categories
-- ============================================================

-- Business directory: lightweight entity that can exist
-- before a business registers. Users create these organically.
create table public.businesses (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  -- Normalized name for deduplication (lowercase, trimmed)
  name_normalized text not null,
  -- If a store has claimed this business, link it
  store_id uuid references public.stores(id) on delete set null,
  -- Location hint (optional, from the first mention)
  location text,
  -- Category hint
  category text,
  -- How many times this business has been mentioned
  mention_count integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Unique on normalized name to prevent duplicates
  constraint unique_business_name unique (name_normalized)
);

-- Junction: which listing mentions which business
create table public.listing_business_tags (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  business_id uuid references public.businesses(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(listing_id, business_id)
);

-- Add tagged_business_id shortcut on listings (for the primary/single tag)
alter table public.listings
  add column tagged_business_id uuid references public.businesses(id) on delete set null;

-- Indexes
create index businesses_name_normalized_idx on public.businesses(name_normalized);
create index businesses_store_id_idx on public.businesses(store_id);
create index businesses_mention_count_idx on public.businesses(mention_count desc);
create index listing_business_tags_listing_idx on public.listing_business_tags(listing_id);
create index listing_business_tags_business_idx on public.listing_business_tags(business_id);
create index listings_tagged_business_idx on public.listings(tagged_business_id);

-- Enable RLS
alter table public.businesses enable row level security;
alter table public.listing_business_tags enable row level security;

-- RLS: businesses are viewable by everyone
create policy "Businesses are viewable by everyone"
  on public.businesses for select
  using (true);

-- RLS: authenticated users can create businesses
create policy "Users can create businesses"
  on public.businesses for insert
  with check (auth.role() = 'authenticated');

-- RLS: business tags viewable by everyone
create policy "Business tags are viewable by everyone"
  on public.listing_business_tags for select
  using (true);

-- RLS: authenticated users can tag businesses
create policy "Users can tag businesses"
  on public.listing_business_tags for insert
  with check (auth.role() = 'authenticated');

-- Trigger: auto-update mention_count when a tag is added/removed
create or replace function public.handle_business_mention_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.businesses
    set mention_count = mention_count + 1
    where id = NEW.business_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.businesses
    set mention_count = greatest(mention_count - 1, 0)
    where id = OLD.business_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_business_tag_change
  after insert or delete on public.listing_business_tags
  for each row execute procedure public.handle_business_mention_count();

-- ============================================================
-- Full-text search index on businesses for the tag picker
-- ============================================================
create index businesses_name_trgm_idx on public.businesses
  using gin (name_normalized gin_trgm_ops);

-- Note: If gin_trgm_ops fails (pg_trgm not enabled), the index
-- won't be created. The search will still work via ILIKE fallback.
-- To enable: create extension if not exists pg_trgm;
