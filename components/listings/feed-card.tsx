'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, MessageCircle, Wrench, Megaphone, Newspaper, Tag, Share2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LikeButton } from '@/components/listings/like-button'
import { SaveButton } from '@/components/listings/save-button'
import type { ListingWithImages } from '@/lib/types/database'

interface FeedCardProps {
  listing: ListingWithImages
}

const TYPE_CONFIG = {
  product: { label: 'En Venta', color: 'bg-green-50 text-green-700 border-green-200', icon: Tag },
  service: { label: 'Servicio', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Wrench },
  event:   { label: 'Evento', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Megaphone },
  news:    { label: 'Noticia', color: 'bg-slate-50 text-slate-700 border-slate-200', icon: Newspaper },
} as const

const NEWS_CATEGORY_COLORS: Record<string, string> = {
  'Noticias Locales':      'bg-blue-50 text-blue-700',
  'Objetos Perdidos':      'bg-amber-50 text-amber-700',
  'Seguridad Pública':     'bg-red-50 text-red-700',
  'Anuncios Comunitarios': 'bg-green-50 text-green-700',
  'Empleos':               'bg-purple-50 text-purple-700',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function handleShare(e: React.MouseEvent, listing: ListingWithImages) {
  e.preventDefault()
  e.stopPropagation()
  const url = `${window.location.origin}/listings/${listing.id}`
  if (navigator.share) {
    navigator.share({ title: listing.title, url })
  } else {
    navigator.clipboard.writeText(url)
  }
}

export function FeedCard({ listing }: FeedCardProps) {
  const primaryImage = listing.images?.length ? listing.images[0].image_url : null
  const listingType = listing.listing_type || 'product'
  const config = TYPE_CONFIG[listingType as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.product
  const TypeIcon = config.icon
  const isNews = listingType === 'news'
  const isEvent = listingType === 'event'

  const formattedPrice = listing.price > 0
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(listing.price)
    : null

  const newsCatColor = isNews ? (NEWS_CATEGORY_COLORS[listing.category] || 'bg-slate-50 text-slate-600') : ''

  return (
    <article className="bg-white border rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
      {/* ── Header: Avatar + Name + Time ── */}
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
        <Link
          href={listing.store ? `/stores/${listing.store.slug}` : `/users/${listing.profile.username}`}
          className="relative h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold overflow-hidden shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {listing.store?.avatar_url ? (
            <Image src={listing.store.avatar_url} alt="" fill className="object-cover" />
          ) : listing.profile.avatar_url ? (
            <Image src={listing.profile.avatar_url} alt="" fill className="object-cover" />
          ) : (
            <span className="text-gray-500">
              {(listing.store?.name || listing.profile.display_name)[0].toUpperCase()}
            </span>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={listing.store ? `/stores/${listing.store.slug}` : `/users/${listing.profile.username}`}
              className="text-sm font-semibold text-gray-900 hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {listing.store?.name || listing.profile.display_name}
            </Link>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 border ${config.color}`}>
              <TypeIcon className="h-2.5 w-2.5 mr-0.5" />
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span>{timeAgo(listing.created_at)}</span>
            {listing.location && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5 truncate">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  {listing.location}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Content: Title + Description ── */}
      <Link href={`/listings/${listing.id}`} className="block">
        <div className="px-4 pb-2">
          {/* For news, show category tag */}
          {isNews && listing.category && (
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mb-1.5 ${newsCatColor}`}>
              {listing.category}
            </span>
          )}
          <h3 className="text-[15px] font-semibold text-gray-900 leading-snug mb-0.5">
            {listing.title}
          </h3>
          {/* Price for products/services */}
          {!isNews && !isEvent && formattedPrice && (
            <p className="text-lg font-bold text-gray-900 mb-1">{formattedPrice}</p>
          )}
          {/* Description preview */}
          {listing.description && (
            <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
              {listing.description}
            </p>
          )}
        </div>

        {/* ── Image ── */}
        {primaryImage && (
          <div className={`relative w-full ${isEvent ? '' : 'aspect-[4/3]'} bg-gray-100`}>
            <Image
              src={primaryImage}
              alt={listing.title}
              {...(isEvent
                ? { width: 600, height: 900, className: 'w-full h-auto' }
                : { fill: true, className: 'object-cover' }
              )}
              sizes="(max-width: 640px) 100vw, 600px"
            />
            {listing.status === 'sold' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Badge className="bg-white text-gray-900 text-sm font-bold">
                  {isNews ? 'Cerrado' : 'Vendido'}
                </Badge>
              </div>
            )}
            {/* Multi-image indicator */}
            {listing.images.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                1/{listing.images.length}
              </div>
            )}
          </div>
        )}
      </Link>

      {/* ── Engagement Bar: Like / Comment / Share / Save ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t">
        <div className="flex items-center gap-4">
          <LikeButton
            listingId={listing.id}
            initialLiked={listing.user_has_liked ?? false}
            initialCount={listing.likes_count ?? 0}
          />
          <Link
            href={`/listings/${listing.id}`}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-xs transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="h-4 w-4" />
            {(listing.comments_count ?? 0) > 0 && (
              <span className="tabular-nums">{listing.comments_count}</span>
            )}
          </Link>
          <button
            onClick={(e) => handleShare(e, listing)}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-xs transition-colors"
            aria-label="Compartir"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
        <SaveButton
          listingId={listing.id}
          initialSaved={listing.user_has_saved ?? false}
          initialCount={listing.saves_count ?? 0}
        />
      </div>
    </article>
  )
}
