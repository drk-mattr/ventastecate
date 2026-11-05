-- Business contact fields: the seed (and later community fills) may carry
-- a phone and a street address. Both nullable, plain text, shown on the
-- business page only when present. No other behavior change.
alter table public.businesses add column if not exists phone text;
alter table public.businesses add column if not exists address text;
