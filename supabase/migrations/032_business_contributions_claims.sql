-- Business contributions + claims (032). A business page can now be
-- completed by the community and claimed by its owner.
--
-- business_contributions: one row per field a user fills in, so every
-- value on a shell carries attribution and history. The fill flow writes
-- the value live onto businesses and logs it here; flagging a bad value
-- restores the previous one and files a report for the moderator.
--
-- business_claim_requests: owner claim requests, reviewed manually by the
-- moderator from /admin/claim-requests (v1 has no WhatsApp-code
-- auto-verification yet — that needs a message-sending provider and is a
-- later step). Approving sets businesses.claimed_by / claimed_at.

alter table public.businesses
  add column if not exists hours text;
alter table public.businesses
  add column if not exists website text;
alter table public.businesses
  add column if not exists claimed_by uuid references public.profiles(id) on delete set null;
alter table public.businesses
  add column if not exists claimed_at timestamptz;

create table if not exists public.business_contributions (
  id uuid default gen_random_uuid() primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  field text not null check (field in ('phone', 'address', 'hours', 'category', 'website')),
  old_value text,
  new_value text not null,
  flagged_at timestamptz,
  flagged_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);
create index if not exists business_contributions_business_idx
  on public.business_contributions(business_id, created_at desc);

create table if not exists public.business_claim_requests (
  id uuid default gen_random_uuid() primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  owner_name text,
  whatsapp_number text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  report_id uuid references public.reports(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists business_claim_requests_business_idx
  on public.business_claim_requests(business_id, created_at desc);
create index if not exists business_claim_requests_status_idx
  on public.business_claim_requests(status, created_at desc);

-- Reports can point at a business (claim requests and bad-info flags),
-- next to the existing listing_id / conversation_id pointers.
alter table public.reports
  add column if not exists business_id uuid references public.businesses(id) on delete set null;

-- Contributions are public attribution (anyone can read who added what);
-- writes go through the server routes with the service-role key.
alter table public.business_contributions enable row level security;
drop policy if exists "Business contributions viewable by everyone" on public.business_contributions;
create policy "Business contributions viewable by everyone"
  on public.business_contributions for select using (true);

-- Claim requests are private: only superadmins can read them (the
-- /admin/claim-requests page); writes go through the server routes.
alter table public.business_claim_requests enable row level security;
drop policy if exists "superadmin all business_claim_requests" on public.business_claim_requests;
create policy "superadmin all business_claim_requests"
  on public.business_claim_requests for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_superadmin)
  );

notify pgrst, 'reload schema';
