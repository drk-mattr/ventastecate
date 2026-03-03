-- Add 'news' to listing_type allowed values
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN ('product', 'service', 'event', 'news'));

-- Create listing_comments table
CREATE TABLE IF NOT EXISTS public.listing_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS listing_comments_listing_id_idx ON public.listing_comments(listing_id);
CREATE INDEX IF NOT EXISTS listing_comments_created_at_idx ON public.listing_comments(created_at);

ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON public.listing_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.listing_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.listing_comments FOR DELETE
  USING (auth.uid() = user_id);
