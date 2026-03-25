'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Flame, Newspaper, AlertTriangle, Heart, Tag } from 'lucide-react'
import type { ListingWithImages } from '@/lib/types/database'

interface TrendingStripProps {
  items: ListingWithImages[]
}

const TYPE_ICON = {
  news:    { icon: Newspaper, color: 'bg-red-500' },
  product: { icon: Tag, color: 'bg-green-500' },
  service: { icon: Heart, color: 'bg-blue-500' },
  event:   { icon: AlertTriangle, color: 'bg-amber-500' },
} as const

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

export function TrendingStrip({ items }: TrendingStripProps) {
  if (!items.length) return null

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-3">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            En Tecate ahora
          </span>
        </div>

        {/* Horizontal scrollable strip */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {items.map((item) => {
            const listingType = item.listing_type || 'product'
            const config = TYPE_ICON[listingType as keyof typeof TYPE_ICON] || TYPE_ICON.product
            const Icon = config.icon
            const primaryImage = item.images?.[0]?.image_url
            const likesCount = item.likes_count ?? 0

            return (
              <Link
                key={item.id}
                href={`/listings/${item.id}`}
                className="flex-none w-36 group"
              >
                <div className="rounded-lg border bg-white overflow-hidden hover:shadow-sm transition-shadow">
                  {/* Thumbnail */}
                  {primaryImage ? (
                    <div className="relative aspect-[4/3] bg-gray-100">
                      <Image
                        src={primaryImage}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="144px"
                      />
                      {/* Type indicator dot */}
                      <div className={`absolute top-1 left-1 ${config.color} rounded-full p-0.5`}>
                        <Icon className="h-2 w-2 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className={`aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  {/* Info */}
                  <div className="px-2 py-1.5">
                    <p className="text-[11px] font-medium text-gray-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] text-gray-400">{timeAgo(item.created_at)}</span>
                      {likesCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                          <Heart className="h-2 w-2" />{likesCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
