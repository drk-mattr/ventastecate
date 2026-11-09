import { resolveCardColor } from '@/lib/listings/card-colors'

interface ListingTitleCardProps {
  title: string
  /** Stored listings.card_color — missing/unknown reads as orange. */
  cardColor?: string | null
  /** 'card' for feed grids, 'hero' for the detail page. */
  size?: 'card' | 'hero'
  /** Layout classes from the caller (aspect, rounding). */
  className?: string
  /** Optional small line under the title (events: date · venue). */
  subtitle?: string | null
}

/**
 * Designed title card for photo-less news/event listings: solid
 * background in the stored color, big white title text. Used by the
 * feed card and the detail page when a news/event listing has no
 * photos. Listings with photos never render this.
 *
 * NOTE (A1, 2026-11-07): the root div must NOT carry `relative`.
 * Feed callers pass `absolute inset-0` expecting the card to fill
 * its square frame; with both classes present, `.relative` wins in
 * the stylesheet (same specificity, later rule), `inset-0` becomes
 * a no-op, and the card collapses to text height — an orange band
 * over a white void. Positioning is the caller's job entirely.
 */
export function ListingTitleCard({
  title,
  cardColor,
  size = 'card',
  className = '',
  subtitle,
}: ListingTitleCardProps) {
  const color = resolveCardColor(cardColor)
  return (
    <div
      className={`flex flex-col items-center justify-center overflow-hidden ${className}`}
      style={{ backgroundColor: color.hex }}
    >
      {/* w-full on both text lines: the clamped text is a flex item,
          and without a width pin its line box can lay out wider than
          the card, so long titles get hard-clipped mid-word at the
          card edge instead of wrapping cleanly (observed on the
          Gastronómico title card, 2026-11-09). w-full pins the line
          box to the card width; centering is unchanged. */}
      <p
        className={`w-full text-white font-bold text-center leading-snug ${
          size === 'hero'
            ? 'text-2xl sm:text-3xl line-clamp-4 px-6 py-8'
            : 'text-base line-clamp-4 px-3'
        }`}
      >
        {title}
      </p>
      {subtitle && size === 'card' && (
        <p className="mt-1.5 px-3 w-full text-center text-xs font-medium leading-snug text-white/80 line-clamp-2">
          {subtitle}
        </p>
      )}
    </div>
  )
}
