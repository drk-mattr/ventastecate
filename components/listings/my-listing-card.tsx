'use client'

import { ListingCard } from '@/components/listings/listing-card'
import { MarkSoldButton } from '@/components/listings/mark-sold-button'
import type { ListingWithImages } from '@/lib/types/database'

/**
 * Mis anuncios card with the owner's one-tap sold control underneath.
 * The card itself stays the shared ListingCard (no buttons on grid
 * cards anywhere else); the sold button lives below it, only on the
 * owner's own list.
 */
export function MyListingCard({ listing }: { listing: ListingWithImages }) {
  return (
    <div className="space-y-2">
      <ListingCard listing={listing} />
      <MarkSoldButton listingId={listing.id} initialSold={listing.status === 'sold'} />
    </div>
  )
}
