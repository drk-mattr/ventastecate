'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Wrench, Megaphone, Store, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ListingWithImages } from '@/lib/types/database'
import { formatPrice } from '@/lib/listings/format-price'
import { ListingTitleCard } from './listing-title-card'

interface ListingCardProps {
  listing: ListingWithImages
}

const TYPE_STYLES = {
  service: { gradient: 'from-gray-700 to-gray-900' },
  event:   { gradient: 'from-amber-500 to-orange-600' },
  product: { gradient: 'from-gray-500 to-gray-700' },
  news:    { gradient: 'from-slate-700 to-slate-900' },
} as const

const TYPE_BADGE: Record<string, { icon: React.ElementType; label: string } | null> = {
  service: { icon: Wrench,    label: 'Servicio' },
  event:   { icon: Megaphone, label: 'Evento' },
  product: null,
  news:    null,
}

const NEWS_CATEGORY_COLORS: Record<string, string> = {
  'Noticias':      'text-gray-500',
  'Objetos Perdidos':      'text-gray-500',
  'Seguridad Pública':     'text-gray-500',
  'Anuncios Comunitarios': 'text-gray-500',
  'Empleos':               'text-gray-500',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// Shared card shell — uniform across all types
function CardShell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Link href={`/listings/${id}`} className="group h-full">
      <div className="h-full flex flex-col rounded-xl border bg-white hover:shadow-md transition-shadow overflow-hidden">
        {children}
      </div>
    </Link>
  )
}

export function ListingCard({ listing }: ListingCardProps) {
  const primaryImage = listing.images?.length ? listing.images[0].image_url : null
  const listingType = listing.listing_type || 'product'
  const isNews = listingType === 'news'
  const hasVideo = !!listing.video_url

  const formattedPrice = formatPrice(listing.price, listing.currency, { isFree: listing.is_free })

  const soldOverlay = (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
      <Badge variant="secondary" className="text-xs">
        {isNews ? 'Cerrado' : 'Vendido'}
      </Badge>
    </div>
  )

  // ── News card ──────────────────────────────────────────────────────────────
  if (isNews) {
    const categoryColor = NEWS_CATEGORY_COLORS[listing.category] || 'text-slate-500'
    return (
      <CardShell id={listing.id}>
        {primaryImage ? (
          <div className="px-2.5 pt-2.5 shrink-0">
            <div className="relative aspect-video rounded-sm overflow-hidden">
              <Image src={primaryImage} alt={listing.title} fill className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" />
              {listing.status === 'sold' && soldOverlay}
            </div>
          </div>
        ) : (
          /* Photo-less news: designed title card in the stored color
             (migration 039). The title lives on the card, so the
             headline below is skipped to avoid showing it twice. */
          <div className="px-2.5 pt-2.5 shrink-0">
            <ListingTitleCard title={listing.title} cardColor={listing.card_color} size="card" className="aspect-video rounded-sm" />
          </div>
        )}
        <div className="flex flex-col flex-1 px-2.5 pt-2 pb-2.5">
          {listing.category && (
            <p className={`text-[9px] font-bold uppercase tracking-wider mb-1 leading-none ${categoryColor}`}>
              {listing.category}
            </p>
          )}
          {primaryImage && (
            <h3 className="font-semibold text-[13px] line-clamp-2 mb-1 group-hover:underline leading-snug">
              {listing.title}
            </h3>
          )}
          {listing.description && (
            <p className="text-[11px] text-gray-400 line-clamp-2 leading-snug">
              {listing.description.slice(0, 300)}
            </p>
          )}
          {/* Meta footer — like/save live on the detail page now, not on
              grid cards (OfferUp shows no buttons on its cards either). */}
          <div className="flex items-center gap-2 mt-auto pt-1.5">
            <span className="text-[10px] text-gray-400">{timeAgo(listing.created_at)}</span>
          </div>
        </div>
      </CardShell>
    )
  }

  // ── Event card: full-width natural poster ─────────────────────────────────
  if (listingType === 'event' && primaryImage) {
    return (
      <CardShell id={listing.id}>
        <div className="relative w-full shrink-0">
          <Image src={primaryImage} alt={listing.title}
            width={400} height={600} className="w-full h-auto" />
          {listing.status === 'sold' && soldOverlay}
        </div>
        <div className="px-2.5 py-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400 truncate">{listing.location}</span>
            {(listing.price > 0 || listing.is_free) && (
              <span className="text-[11px] font-semibold text-gray-900 shrink-0 ml-1">{formattedPrice}</span>
            )}
          </div>
        </div>
      </CardShell>
    )
  }

  // ── Standard card (products, services, no-image events) ───────────────────
  return (
    <CardShell id={listing.id}>
      {/* Image area */}
      <div className="relative aspect-square bg-gray-100 shrink-0">
        {primaryImage ? (
          <Image src={primaryImage} alt={listing.title} fill className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" />
        ) : listingType === 'event' ? (
          /* Photo-less event: designed title card in the stored color
             (migration 039). Products/services never get title cards —
             they require a photo, so they keep the neutral fallback. */
          <ListingTitleCard title={listing.title} cardColor={listing.card_color} size="card" className="absolute inset-0" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${TYPE_STYLES[listingType as keyof typeof TYPE_STYLES]?.gradient || TYPE_STYLES.product.gradient} flex items-center justify-center p-3`}>
            <p className="text-white font-bold text-lg leading-snug text-center line-clamp-3">
              {listing.title}
            </p>
          </div>
        )}
        {listing.status === 'sold' && soldOverlay}
        {/* Type badge (Servicio / Evento) — only over a real photo. On a
            title card or the gradient fallback the badge sits on top of
            the title text (the first characters hide behind the pill),
            and the colored card already identifies the event. */}
        {primaryImage && TYPE_BADGE[listingType] && (() => {
          const badge = TYPE_BADGE[listingType]!
          const Icon = badge.icon
          return (
            <span className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur text-gray-700 text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Icon className="h-2.5 w-2.5" />{badge.label}
            </span>
          )
        })()}
        {/* Multi-image indicator */}
        {listing.images?.length > 1 && (
          <div className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">
            {listing.images.length}
          </div>
        )}
        {/* Video indicator */}
        {hasVideo && (
          <div className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <Play className="h-2.5 w-2.5 fill-current" />Video
          </div>
        )}
      </div>
      {/* Content */}
      <div className="px-2 py-1.5 flex flex-col flex-1">
        {/* Price — the dominant element */}
        <p className="text-[15px] font-bold text-gray-900 leading-tight">
          {formattedPrice}
        </p>
        {/* Title — secondary, single line */}
        {primaryImage && (
          <h3 className="text-[13px] text-gray-700 line-clamp-1 leading-snug group-hover:text-gray-900 transition-colors">
            {listing.title}
          </h3>
        )}
        {/* Meta + engagement on one compact row */}
        <div className="flex items-center justify-between gap-1.5 mt-auto pt-1">
          <span className="text-xs text-gray-500 truncate flex items-center gap-1 min-w-0">
            {listing.store && <Store className="h-2.5 w-2.5 shrink-0" />}
            <span className="truncate">
              {[listing.store?.name || listing.profile?.display_name || listing.location, timeAgo(listing.created_at)].filter(Boolean).join(' · ')}
            </span>
          </span>
        </div>
      </div>
    </CardShell>
  )
}
