'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth/auth-context'
import { ListingCard } from '@/components/listings/listing-card'
import type { ListingWithImages } from '@/lib/types/database'

interface CommunityFeedProps {
  initialListings: ListingWithImages[]
  /** Override the grid classes (e.g. the search page uses a denser grid). */
  className?: string
}

const DEFAULT_GRID =
  'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 items-start'

/**
 * Client wrapper that hydrates listings with the current user's
 * like/save state, then renders the grid of ListingCards.
 */
export function CommunityFeed({ initialListings, className }: CommunityFeedProps) {
  const { user } = useAuth()
  const [listings, setListings] = useState<ListingWithImages[]>(initialListings)

  // After mount, enrich listings with user's like/save state
  useEffect(() => {
    if (!user || initialListings.length === 0) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const listingIds = initialListings.map(l => l.id)

    Promise.all([
      supabase
        .from('listing_likes')
        .select('listing_id')
        .eq('user_id', user.id)
        .in('listing_id', listingIds),
      supabase
        .from('listing_saves')
        .select('listing_id')
        .eq('user_id', user.id)
        .in('listing_id', listingIds),
    ]).then(([likesRes, savesRes]) => {
      const likedIds = new Set((likesRes.data || []).map(l => l.listing_id))
      const savedIds = new Set((savesRes.data || []).map(s => s.listing_id))

      setListings(initialListings.map(listing => ({
        ...listing,
        user_has_liked: likedIds.has(listing.id),
        user_has_saved: savedIds.has(listing.id),
      })))
    })
  }, [user, initialListings])

  return (
    <div className={className ?? DEFAULT_GRID}>
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
