-- Add listing_type column to support services and events
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'product';

-- Add check constraint for valid values
ALTER TABLE listings
ADD CONSTRAINT listings_listing_type_check
CHECK (listing_type IN ('product', 'service', 'event'));
