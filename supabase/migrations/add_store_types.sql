-- Migration: Add store types and listing metadata
-- Run this in the Supabase SQL Editor

-- 1. Add store_type to stores
alter table public.stores
  add column store_type text not null default 'general'
  check (store_type in ('general', 'real_estate', 'automotive'));

-- 2. Add metadata JSONB to listings
alter table public.listings
  add column metadata jsonb;
