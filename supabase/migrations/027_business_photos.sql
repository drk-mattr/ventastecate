-- Business photos: a business page can now show real photos, not just a
-- gray store icon. The main photo lives on businesses.image_url; the full
-- set lives in business_images so a page can show a gallery.
alter table public.businesses add column if not exists image_url text;

create table if not exists public.business_images (
  id uuid default gen_random_uuid() primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  image_url text not null,
  order_index integer not null default 0,
  created_at timestamp with time zone default now() not null
);
create index if not exists business_images_business_idx on public.business_images(business_id);

alter table public.business_images enable row level security;
create policy "Business images viewable by everyone" on public.business_images for select using (true);
