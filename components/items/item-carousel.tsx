'use client'

// Items engine — homepage item carousel (DoorDash "Featured Items"
// row, 034D activity ordering).
//
// One card per trending offering: best photo, kind name, the business
// it belongs to, and the mention count. NO price, NO like-percentage
// — there are no ratings or reliable prices yet, so mentions are the
// honest signal. The rank badge is our En tendencia rank. A card tap
// opens the item view (/items/[id]); there is no "+" / add-to-cart —
// there is no ordering here, so the card's action is opening the
// view, and the view's action is contributing a photo.
//
// Renders NOTHING until the §11.3 gate passes (the parent only
// passes non-empty cards when the gate passed) — same cold-start
// rule as the trending strip: no fake data, no empty row.

import Link from 'next/link'
import Image from 'next/image'
import { Flame, Tag } from 'lucide-react'
import type { TrendingItemCard } from '@/lib/items/carousel'

export function ItemCarousel({ items }: { items: TrendingItemCard[] }) {
  if (!items.length) return null

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-3">
        {/* Header: "En tendencia" is the honest label — this list is
            ordered by activity_score (§7.1), never "Más mencionados"
            and never "Lo mejor de Tecate". */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <Flame className="h-3.5 w-3.5 text-gray-900" />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            En tendencia
          </span>
        </div>

        {/* Horizontal scrollable row */}
        <div
          className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <Link
              key={item.itemId}
              href={`/items/${item.itemId}`}
              className="flex-none w-44 group"
            >
              <div className="rounded-lg border bg-white overflow-hidden hover:shadow-sm transition-shadow">
                {/* Photo: the best photo of the offering, from its most
                    recent ACTIVE primary mention. */}
                {item.photoUrl ? (
                  <div className="relative aspect-[4/3] bg-gray-100">
                    <Image
                      src={item.photoUrl}
                      alt={item.kindName}
                      fill
                      className="object-cover"
                      sizes="176px"
                    />
                    <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white text-[10px] font-semibold">
                      {item.rank}
                    </span>
                  </div>
                ) : (
                  <div className="relative aspect-[4/3] bg-gray-100 flex items-center justify-center">
                    <Tag className="h-5 w-5 text-gray-400" />
                    <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white text-[10px] font-semibold">
                      {item.rank}
                    </span>
                  </div>
                )}
                {/* Info */}
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-gray-900 line-clamp-1 leading-tight group-hover:underline">
                    {item.kindName}
                  </p>
                  <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                    de {item.businessName}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {item.contributors > 0
                      ? `Mencionado por ${item.contributors} ${item.contributors === 1 ? 'persona' : 'personas'}`
                      : `${item.mentionCount} ${item.mentionCount === 1 ? 'mención' : 'menciones'}`}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
