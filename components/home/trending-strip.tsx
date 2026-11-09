'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Flame, Newspaper, AlertTriangle, Heart, Tag } from 'lucide-react'
import type { ListingWithImages } from '@/lib/types/database'
import { trendingHeadingForLocation } from '@/lib/business-regions'
import { ListingTitleCard } from '@/components/listings/listing-title-card'

interface TrendingStripProps {
  items: ListingWithImages[]
  // Label from the vt_region cookie (LOCATION_OPTIONS label, 'Tecate'
  // default) — the heading names the place being browsed, not always Tecate.
  locationLabel?: string | null
  // Primary item mention per listing id, keyed by listing id (kind wins
  // over category for the # chip) — fetched in the page, empty at cold
  // start when no post has a mention yet.
  primaryKinds?: Record<string, { name: string; slug: string }>
}

const TYPE_ICON = {
  news:    { icon: Newspaper },
  product: { icon: Tag },
  service: { icon: Heart },
  event:   { icon: AlertTriangle },
} as const

// Hashtag-style label from an existing category/kind name: spaces
// stripped, words joined — "Objetos Perdidos" -> "#ObjetosPerdidos".
// No new taxonomy: only existing categories/kinds are ever surfaced.
function hashtag(label: string): string {
  return `#${label.trim().replace(/\s+/g, '')}`
}

export function TrendingStrip({ items, locationLabel, primaryKinds }: TrendingStripProps) {
  if (!items.length) return null

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-3">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <Flame className="h-3.5 w-3.5 text-gray-900" />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {trendingHeadingForLocation(locationLabel)}
          </span>
        </div>

        {/* Horizontal scrollable strip — all-image square cards */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {items.map((item) => {
            const listingType = item.listing_type || 'product'
            const config = TYPE_ICON[listingType as keyof typeof TYPE_ICON] || TYPE_ICON.product
            const Icon = config.icon
            const primaryImage = item.images?.[0]?.image_url

            // # chip: the primary item kind wins when the post mentions
            // one (more specific), otherwise the listing's category.
            // Either is a real destination — kind page, or search
            // filtered by that category. Neither -> no chip, never empty.
            const kind = primaryKinds?.[item.id]
            const category = item.category?.trim()
            const chip = kind
              ? { label: hashtag(kind.name), href: `/tipos/${kind.slug}` }
              : category
                ? { label: hashtag(category), href: `/search?category=${encodeURIComponent(category)}` }
                : null

            return (
              <div key={item.id} className="relative flex-none w-20">
                <Link
                  href={`/listings/${item.id}`}
                  className="block"
                >
                  {primaryImage ? (
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={primaryImage}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  ) : (listingType === 'news' || listingType === 'event') ? (
                    /* Photo-less news/event: designed title card in the
                       stored color, square. */
                    <ListingTitleCard
                      title={item.title}
                      cardColor={item.card_color}
                      size="card"
                      className="aspect-square rounded-lg"
                    />
                  ) : (
                    /* Photo-less product/service: neutral gradient + icon,
                       square. */
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </Link>
                {chip && (
                  <Link
                    href={chip.href}
                    title={chip.label}
                    className="absolute bottom-1.5 left-1.5 z-10 max-w-[calc(100%-12px)] truncate rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-semibold text-white"
                  >
                    {chip.label}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
