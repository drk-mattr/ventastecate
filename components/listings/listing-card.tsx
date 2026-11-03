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
  'Noticias Locales':      'text-gray-500',
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

// ── Tiny inline like/save overlay for grid cards ──
function CardEngagement({ listing, inline = false }: { listing: ListingWithImages; inline?: boolean }) {
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
      const { error } = was
        ? await supabase.from('listing_likes').delete().eq('listing_id', listing.id).eq('user_id', user.id)
        : await supabase.from('listing_likes').insert({ listing_id: listing.id, user_id: user.id })
      if (error) { setLiked(was); setLikesCount(prev => was ? prev + 1 : Math.max(prev - 1, 0)) }
    })
  }

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { router.push('/login'); return }
    const was = saved
    setSaved(!was)
    startTransition(async () => {
      const { error } = was
        ? await supabase.from('listing_saves').delete().eq('listing_id', listing.id).eq('user_id', user.id)
        : await supabase.from('listing_saves').insert({ listing_id: listing.id, user_id: user.id })
      if (error) { setSaved(was) }
    })
  }

  return (
    <div className={inline ? 'flex items-center gap-2' : 'flex items-center gap-2 mt-auto pt-1'}>
      <button onClick={toggleLike} disabled={isPending}
        className={`flex items-center gap-1 text-xs transition-colors ${liked ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
        <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
        {likesCount > 0 && <span>{likesCount}</span>}
      </button>
      <button onClick={toggleSave} disabled={isPending}
        className={`flex items-center gap-1 text-xs transition-colors ${saved ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
        <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
      </button>
      {!inline && (listing.comments_count ?? 0) > 0 && (
        <span className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
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
        {/* Type badge (Servicio / Evento) */}
        {TYPE_BADGE[listingType] && (() => {
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
          {formattedPrice || 'Consultar precio'}
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
          <div className="shrink-0">
            <CardEngagement listing={listing} inline />
          </div>
        </div>
      </div>
    </CardShell>
  )
}
