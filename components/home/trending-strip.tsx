'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Flame, Newspaper, AlertTriangle, Heart, Tag } from 'lucide-react'
import type { ListingWithImages } from '@/lib/types/database'
import { ListingTitleCard } from '@/components/listings/listing-title-card'

interface TrendingStripProps {
  items: ListingWithImages[]
}

const TYPE_ICON = {
  news:    { icon: Newspaper },
  product: { icon: Tag },
  service: { icon: Heart },
  event:   { icon: AlertTriangle },
} as const

export function TrendingStrip({ items }: TrendingStripProps) {
  if (!items.length) return null

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-3">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <Flame className="h-3.5 w-3.5 text-gray-900" />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            En Tecate ahora
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

            return (
              <Link
                key={item.id}
                href={`/listings/${item.id}`}
                className="flex-none w-32"
              >
                {primaryImage ? (
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={primaryImage}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="144px"
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
