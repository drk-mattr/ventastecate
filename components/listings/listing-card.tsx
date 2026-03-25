'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Wrench, Megaphone, Store, Heart, Bookmark, MessageCircle, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ListingWithImages } from '@/lib/types/database'
import { useState, useTransition } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth/auth-context'
import { useRouter } from 'next/navigation'

interface ListingCardProps {
  listing: ListingWithImages
}

const TYPE_STYLES = {
  service: { gradient: 'from-blue-600 to-blue-800' },
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
  'Noticias Locales':      'text-blue-600',
  'Objetos Perdidos':      'text-amber-600',
  'Seguridad Pública':     'text-red-600',
  'Anuncios Comunitarios': 'text-green-600',
  'Empleos':               'text-purple-600',
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

// ── Tiny inline like/save overlay for grid cards ──
function CardEngagement({ listing }: { listing: ListingWithImages }) {
  const { user } = useAuth()
  const router = useRouter()
  const [liked, setLiked] = useState(listing.user_has_liked ?? false)
  const [saved, setSaved] = useState(listing.user_has_saved ?? false)
  const [likesCount, setLikesCount] = useState(listing.likes_count ?? 0)
  const [isPending, startTransition] = useTransition()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { router.push('/login'); return }
    const was = liked
    setLiked(!was)
    setLikesCount(prev => was ? Math.max(prev - 1, 0) : prev + 1)
    startTransition(async () => {
      try {
        if (was) {
          await supabase.from('listing_likes').delete().eq('listing_id', listing.id).eq('user_id', user.id)
        } else {
          await supabase.from('listing_likes').insert({ listing_id: listing.id, user_id: user.id })
        }
      } catch { setLiked(was); setLikesCount(prev => was ? prev + 1 : Math.max(prev - 1, 0)) }
    })
  }

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { router.push('/login'); return }
    const was = saved
    setSaved(!was)
    startTransition(async () => {
      try {
        if (was) {
          await supabase.from('listing_saves').delete().eq('listing_id', listing.id).eq('user_id', user.id)
        } else {
          await supabase.from('listing_saves').insert({ listing_id: listing.id, user_id: user.id })
        }
      } catch { setSaved(was) }
    })
  }

  return (
    <div className="flex items-center gap-2 mt-auto pt-1">
      <button onClick={toggleLike} disabled={isPending}
        className={`flex items-center gap-0.5 text-[10px] transition-colors ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}>
        <Heart className={`h-3 w-3 ${liked ? 'fill-current' : ''}`} />
        {likesCount > 0 && <span>{likesCount}</span>}
      </button>
      <button onClick={toggleSave} disabled={isPending}
        className={`flex items-center gap-0.5 text-[10px] transition-colors ${saved ? 'text-blue-500' : 'text-gray-400 hover:text-blue-400'}`}>
        <Bookmark className={`h-3 w-3 ${saved ? 'fill-current' : ''}`} />
      </button>
      {(listing.comments_count ?? 0) > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] text-gray-400 ml-auto">
          <MessageCircle className="h-3 w-3" />{listing.comments_count}
        </span>
      )}
    </div>
  )
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

  const formattedPrice = listing.price > 0
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(listing.price)
    : null

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
        {primaryImage && (
          <div className="px-2.5 pt-2.5 shrink-0">
            <div className="relative aspect-video rounded-sm overflow-hidden">
              <Image src={primaryImage} alt={listing.title} fill className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" />
              {listing.status === 'sold' && soldOverlay}
            </div>
          </div>
        )}
        <div className="flex flex-col flex-1 px-2.5 pt-2 pb-2.5">
          {listing.category && (
            <p className={`text-[9px] font-bold uppercase tracking-wider mb-1 leading-none ${categoryColor}`}>
              {listing.category}
            </p>
          )}
          <h3 className="font-semibold text-[13px] line-clamp-2 mb-1 group-hover:underline leading-snug">
            {listing.title}
          </h3>
          {listing.description && (
            <p className="text-[11px] text-gray-400 line-clamp-2 leading-snug">
              {listing.description.slice(0, 300)}
            </p>
          )}
          {/* Engagement + meta footer */}
          <div className="flex items-center gap-2 mt-auto pt-1.5">
            <span className="text-[10px] text-gray-400">{timeAgo(listing.created_at)}</span>
            <div className="ml-auto">
              <CardEngagement listing={listing} />
            </div>
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
            {formattedPrice && (
              <span className="text-[11px] font-semibold text-gray-900 shrink-0 ml-1">{formattedPrice}</span>
            )}
          </div>
          <CardEngagement listing={listing} />
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
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${TYPE_STYLES[listingType as keyof typeof TYPE_STYLES]?.gradient || TYPE_STYLES.product.gradient} flex items-center justify-center p-3`}>
            <p className="text-white font-bold text-lg leading-snug text-center line-clamp-3">
              {listing.title}
            </p>
          </div>
        )}
        {listing.status === 'sold' && soldOverlay}
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
      <div className="px-2.5 pt-1.5 pb-2 flex flex-col flex-1">
        {primaryImage && (
          <h3 className="font-medium text-[13px] line-clamp-2 mb-0.5 group-hover:text-blue-600 transition-colors leading-snug">
            {listing.title}
          </h3>
        )}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">
            {formattedPrice || 'Consultar precio'}
          </p>
          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {TYPE_BADGE[listingType] && (() => {
              const badge = TYPE_BADGE[listingType]!
              const Icon = badge.icon
              return (
                <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                  <Icon className="h-3 w-3" />{badge.label}
                </span>
              )
            })()}
            {listing.store && (
              <span className="text-[11px] text-gray-400 flex items-center gap-0.5 truncate">
                <Store className="h-3 w-3 shrink-0" />{listing.store.name}
              </span>
            )}
          </div>
        </div>
        <span className="text-[11px] text-gray-400 truncate block">{listing.location}</span>
        {/* Subtle engagement row */}
        <CardEngagement listing={listing} />
      </div>
    </CardShell>
  )
}
