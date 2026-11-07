import { resolveCardColor } from '@/lib/listings/card-colors'

interface ListingTitleCardProps {
  title: string
  /** Stored listings.card_color — missing/unknown reads as orange. */
  cardColor?: string | null
  /** 'card' for feed grids, 'hero' for the detail page. */
  size?: 'card' | 'hero'
  /** Layout classes from the caller (aspect, rounding). */
  className?: string
}

/**
 * Designed title card for photo-less news/event listings: solid
 * background in the stored color, big white title text. Used by the
 * feed card and the detail page when a news/event listing has no
 * photos. Listings with photos never render this.
 */
export function ListingTitleCard({
  title,
  cardColor,
  size = 'card',
  className = '',
}: ListingTitleCardProps) {
  const color = resolveCardColor(cardColor)
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ backgroundColor: color.hex }}
    >
      <p
        className={`text-white font-bold text-center leading-snug ${
          size === 'hero'
            ? 'text-2xl sm:text-3xl line-clamp-4 px-6 py-8'
            : 'text-lg line-clamp-3 px-3'
        }`}
      >
        {title}
      </p>
    </div>
  )
}
