'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Wrench, Megaphone, Store, Play, ThumbsUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ListingWithImages } from '@/lib/types/database'
import { formatPrice } from '@/lib/listings/format-price'
import { formatEventRange, isEventPast } from '@/lib/listings/event-dates'
import { ListingTitleCard } from './listing-title-card'
import { VideoPlayer } from './video-player'
import { nativeVideoOf, listingVideoPublicUrl } from '@/lib/video/types'
import { splitSource, sourceDomain } from '@/lib/listings/article-helpers'

// Public storage base for native video URLs (URL construction
// only, no fetch — the same public env the browser client uses).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

interface ListingCardProps {
  listing: ListingWithImages
}

const TYPE_STYLES = {
  service: { gradient: 'from-gray-700 to-gray-900' },
  event:   { gradient: 'from-amber-500 to-orange-600' },
  product: { gradient: 'from-gray-500 to-gray-700' },
  news:    { gradient: 'from-slate-700 to-slate-900' },
  mention: { gradient: 'from-gray-500 to-gray-700' },
} as const

const TYPE_BADGE: Record<string, { icon: React.ElementType; label: string } | null> = {
  service: { icon: Wrench,    label: 'Servicio' },
  event:   { icon: Megaphone, label: 'Evento' },
  product: null,
  news:    null,
  mention: { icon: ThumbsUp,  label: 'Recomendación' },
}

const NEWS_CATEGORY_COLORS: Record<string, string> = {
  'Noticias':      'text-gray-500',
  'Objetos Perdidos':      'text-gray-500',
  'Seguridad Pública':     'text-gray-500',
  'Anuncios Comunitarios': 'text-gray-500',
  'Empleos':               'text-gray-500',
}

// Lost posts look like a printed missing-pet poster: "SE BUSCA" in
// plain red letters above the photo (or title card), the image inset
// with a generous white margin on all sides — no banner strip. The
// feed photo is black-and-white (grayscale) and shows FULLY
// (object-contain in the 4:5 media slot — it is the evidence for
// identifying the animal, so it is never cropped); the card shows
// heading + image + title + time only, no description (the full
// description stays on the detail page). The heading is the one
// accepted exception to uniform card heights: a lost-post card ends
// ~one line taller than its row. The detail-page hero keeps full
// color and full bleed, because color matters for actually
// identifying the animal.
const SE_BUSCA_HEADING = (
  <p className="shrink-0 px-2.5 pt-2 pb-1 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-red-600">
    Se busca
  </p>
)

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

// First ~140 characters of a news body as a card lede: whitespace
// collapsed, cut back to a word boundary, ellipsis when trimmed.
// The Fuente line is already stripped by splitSource before this
// runs, so the lede never shows the source URL. Empty body → null
// (no lede line, no gap).
function newsLede(body: string, maxLen = 140): string | null {
  const flat = body.replace(/\s+/g, ' ').trim()
  if (!flat) return null
  if (flat.length <= maxLen) return flat
  const cut = flat.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  const trimmed = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()
  return `${trimmed}…`
}

// Uniform grid construction (2026-11-11): every variant is the SAME
// height in a grid row, by construction — media slot aspect-[4/5]
// of the column width + a fixed h-[90px] text area, top-aligned,
// nothing bottom-pinned, no mt-auto. The 90px fits the tallest
// text content (news eyebrow + title line-clamp-2 + meta row,
// ~86px); shorter variants carry the slack as bottom padding inside
// their text block. The card is only as tall as those two blocks:
// no h-full, so a tall neighbor cannot stretch it (the grids use
// items-start). Exceptions: (1) lost posts add the SE BUSCA heading
// above the media (~28px taller) — the printed-poster treatment is
// not negotiable, so that row ends ~one line lower. (2) Editorial
// news cards (2026-11-17, non-lost only) use a landscape 16:9
// media slot, and the text area below is taller by exactly the
// height the photo lost — pb-[calc(68.75%+90px)] — so the total
// still equals 5/4 W + 90px, the same as every row-mate.
function CardShell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Link href={`/listings/${id}`} className="group">
      <div className="flex flex-col rounded-xl border bg-white hover:shadow-md transition-shadow overflow-hidden">
        {children}
      </div>
    </Link>
  )
}

// Editorial news text area (non-lost news only, 2026-11-17): the
// media slot went landscape (16:9), so this area is taller than
// the 90px of every other variant by exactly the height the photo
// lost — 0.6875 × the column width — keeping the card's total
// height identical to its row-mates: 9/16 W + (11/16 W + 90px) =
// 5/4 W + 90px. The height is padding-bottom (percentages resolve
// against the card width), with the content absolutely positioned
// inside; content is top-aligned, nothing bottom-pinned. Contents:
// red NOTICIA marker + category eyebrow, serif headline
// (font-forum, the news typeface), a two-line lede, source domain
// + time. No lede → no lede line, no gap.
function EditorialNewsTextArea({
  listing,
  categoryColor,
  lede,
  sourceHost,
}: {
  listing: ListingWithImages
  categoryColor: string
  lede: string | null
  sourceHost: string | null
}) {
  return (
    <div className="relative w-full shrink-0 pb-[calc(68.75%+90px)]">
      <div className="absolute inset-0 px-2.5 pt-2 pb-2 flex flex-col">
        <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5 leading-none">
          <span className="text-red-600">Noticia</span>
          {listing.category && (
            <span className={`ml-1 ${categoryColor}`}>· {listing.category}</span>
          )}
        </p>
        <h3 className="font-forum font-bold text-[16px] leading-snug line-clamp-3 mb-1.5 group-hover:underline">
          {listing.title}
        </h3>
        {lede && (
          <p className="text-[12px] text-gray-500 leading-snug line-clamp-2 mb-1.5">{lede}</p>
        )}
        {/* Meta footer — source domain + time, like a news byline. */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-gray-400">
            {sourceHost ? `${sourceHost} · ${timeAgo(listing.created_at)}` : timeAgo(listing.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter()
  const primaryImage = listing.images?.length ? listing.images[0].image_url : null
  const listingType = listing.listing_type || 'product'
  const isNews = listingType === 'news'
  const hasVideo = !!listing.video_url
  // Native video (migration 050, news only): the clip IS the
  // content — it takes the media slot instead of the photo. The
  // feed query selects `*,` so the columns arrive once 050 is
  // applied; pre-050 nativeVideo is null and the card renders
  // exactly as before.
  const nativeVideo = nativeVideoOf(listing)
  const nativeVideoUrl =
    nativeVideo && SUPABASE_URL ? listingVideoPublicUrl(SUPABASE_URL, nativeVideo.path) : null

  // The seller shown on the card — a store name goes to the store
  // page, a personal name to the public profile. The whole card is
  // itself a link to the listing, so the name navigates with the
  // router instead of a nested <a> (invalid HTML), stopping the
  // card's own navigation like the like/save buttons do.
  const sellerName = listing.store?.name || listing.profile?.display_name || null
  const sellerHref = listing.store
    ? `/stores/${listing.store.slug}`
    : listing.profile?.username
      ? `/users/${listing.profile.username}`
      : null
  const goToSeller = (e: React.MouseEvent) => {
    if (!sellerHref) return
    e.preventDefault()
    e.stopPropagation()
    router.push(sellerHref)
  }

  const formattedPrice = formatPrice(listing.price, listing.currency, { isFree: listing.is_free })

  // Structured event dates (migration 043): pre-043 every field is
  // undefined and all of this is null/false — the card renders
  // exactly as before.
  const eventStartsAt = listing.event_starts_at ?? null
  const eventEndsAt = listing.event_ends_at ?? null
  const eventDateLine = listingType === 'event' ? formatEventRange(eventStartsAt, eventEndsAt) : null
  const eventPast = listingType === 'event' && isEventPast(eventStartsAt, eventEndsAt)
  // Title-card subtitle (A4): the date line when there is one, then
  // the venue (or town). Price already rides as a chip at the bottom
  // of the card, so it is not repeated here.
  const eventSubtitle = listingType === 'event'
    ? [eventDateLine, listing.event_venue || listing.location].filter(Boolean).join(' · ') || null
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
    const isLostPost = listing.category === 'Objetos Perdidos'

    // ── Lost posts: the printed-poster treatment, EXACTLY as-is.
    // SE BUSCA in red letters above the media, the photo inset with
    // a white margin, grayscale, object-contain (it shows FULLY —
    // it is the evidence for identifying the animal). This branch
    // is untouched by the editorial news change below: same 4:5
    // slot, same h-[90px] text area, same ~28px-taller card.
    if (isLostPost) {
      if (!primaryImage && !nativeVideo) {
        return (
          <CardShell id={listing.id}>
            {SE_BUSCA_HEADING}
            <div className="relative aspect-[4/5] w-full shrink-0">
              <ListingTitleCard
                title={listing.title}
                cardColor={listing.card_color}
                size="card"
                className="absolute inset-x-4 top-0 bottom-2"
              />
              {listing.status === 'sold' && soldOverlay}
            </div>
            <div className="h-[90px] shrink-0 px-2.5 pt-1.5 pb-2">
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-400">{timeAgo(listing.created_at)}</span>
              </div>
            </div>
          </CardShell>
        )
      }

      return (
        <CardShell id={listing.id}>
          {SE_BUSCA_HEADING}
          {nativeVideo && nativeVideoUrl ? (
            /* Native clip: muted autoplay in view, tap for sound.
               The photo (if any) stays on the detail page gallery.
               The clip letterboxes (object-contain) in the 4:5 slot —
               it shows fully, never cropped, at the uniform height. */
            <VideoPlayer
              src={nativeVideoUrl}
              posterUrl={nativeVideo.thumbnailUrl}
              durationSeconds={nativeVideo.durationSeconds}
              title={listing.title}
              autoplayInView
              className="aspect-[4/5] w-full shrink-0"
            />
          ) : (
            /* Lost post: a printed-poster look — SE BUSCA in red
               letters above the photo, the photo inset with a white
               margin on all sides. The photo shows FULLY
               (object-contain) — it is the evidence for identifying
               the animal. No category eyebrow — the heading says
               what it is. */
            <div className="relative aspect-[4/5] w-full shrink-0 bg-white">
              <div className="absolute inset-x-4 top-2 bottom-2">
                <Image src={primaryImage!} alt={listing.title} fill className="object-contain grayscale"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" />
                {listing.status === 'sold' && soldOverlay}
              </div>
            </div>
          )}
          <div className="h-[90px] shrink-0 px-2.5 pt-1.5 pb-2">
            <h3 className="font-semibold text-[13px] line-clamp-2 mb-1 group-hover:underline leading-snug">
              {listing.title}
            </h3>
            {/* Meta footer — like/save live on the detail page now, not on
                grid cards (OfferUp shows no buttons on its cards either). */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-400">{timeAgo(listing.created_at)}</span>
            </div>
          </div>
        </CardShell>
      )
    }

    // ── Editorial news card (non-lost only, 2026-11-17): a news
    // story should read as news, not as an item for sale. The photo
    // slot is landscape 16:9 — a landscape news photo now shows as
    // a landscape photo instead of a portrait crop — and the text
    // area below carries the editorial treatment: red NOTICIA
    // marker + category, serif headline, a two-line lede, source
    // domain + time. The text area is taller by exactly the height
    // the photo lost, so the card ends at exactly the same height
    // as its product/event row-mates (see EditorialNewsTextArea).
    // The source comes from the trailing sources the description
    // carries — a "Fuentes:" block (merged stories) or the single
    // "Fuente: <url>" line the community-post endpoint appends
    // (splitSources reads both; the card shows the first source's
    // domain). The detail page reads it the same way; user-posted
    // news has no sources and shows the time alone.
    const { body, sourceUrl } = splitSource(listing.description ?? '')
    const lede = newsLede(body)
    const sourceHost = sourceUrl ? sourceDomain(sourceUrl).replace(/^www\./, '') : null

    // Photo-less news: the orange title card fills the 16:9 media
    // slot instead of 4:5 (title still white on orange, same
    // treatment, just wider/shorter). A native video is not
    // photo-less — it takes the media slot below instead.
    if (!primaryImage && !nativeVideo) {
      return (
        <CardShell id={listing.id}>
          <div className="relative aspect-video w-full shrink-0">
            <ListingTitleCard
              title={listing.title}
              cardColor={listing.card_color}
              size="card"
              className="absolute inset-0"
            />
            {listing.status === 'sold' && soldOverlay}
          </div>
          <EditorialNewsTextArea listing={listing} categoryColor={categoryColor} lede={lede} sourceHost={sourceHost} />
        </CardShell>
      )
    }

    return (
      <CardShell id={listing.id}>
        {nativeVideo && nativeVideoUrl ? (
          /* Native clip: muted autoplay in view, tap for sound.
             The photo (if any) stays on the detail page gallery.
             The clip letterboxes (object-contain) in the 16:9 slot —
             it shows fully, never cropped, at the uniform height. */
          <VideoPlayer
            src={nativeVideoUrl}
            posterUrl={nativeVideo.thumbnailUrl}
            durationSeconds={nativeVideo.durationSeconds}
            title={listing.title}
            autoplayInView
            className="aspect-video w-full shrink-0"
          />
        ) : (
          <div className="relative aspect-video w-full shrink-0 overflow-hidden">
            <Image src={primaryImage!} alt={listing.title} fill className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" />
            {listing.status === 'sold' && soldOverlay}
          </div>
        )}
        <EditorialNewsTextArea listing={listing} categoryColor={categoryColor} lede={lede} sourceHost={sourceHost} />
      </CardShell>
    )
  }

  // ── Event card: the poster IS the content — it must show fully,
  // never cropped. Printed-poster treatment: the 4:5 media slot is
  // full column width and the poster sits inset with a white margin
  // inside it, object-contain, so a portrait poster fills it and a
  // landscape image letterboxes on white matting instead of being
  // sliced. The poster already carries the date/time/venue, so the
  // fixed text area below keeps the title + time only — no date
  // line, no location/price row (those live on the detail page).
  if (listingType === 'event' && primaryImage) {
    return (
      <CardShell id={listing.id}>
        <div className="relative aspect-[4/5] w-full shrink-0 bg-white">
          <div className="absolute inset-x-4 top-2.5 bottom-2.5">
            <Image src={primaryImage} alt={listing.title} fill className="object-contain"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" />
            {listing.status === 'sold' && soldOverlay}
            {eventPast && (
              <span className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                Terminado
              </span>
            )}
          </div>
        </div>
        <div className="h-[90px] shrink-0 px-2.5 pt-1.5 pb-2">
          <h3 className="font-semibold text-[13px] line-clamp-2 mb-1 leading-snug group-hover:underline">
            {listing.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-gray-400">{timeAgo(listing.created_at)}</span>
          </div>
        </div>
      </CardShell>
    )
  }

  // ── Photo-less event: the title card fills the 4:5 media slot
  // (title only — the subtitle moved to the fixed text area below,
  // so it is not repeated inside the orange block). The price rides
  // as the bold first line of the text area when there is one;
  // the time lives in the meta row. No overlay chips.
  if (listingType === 'event' && !primaryImage) {
    return (
      <CardShell id={listing.id}>
        <div className="relative aspect-[4/5] w-full shrink-0">
          <ListingTitleCard title={listing.title} cardColor={listing.card_color} size="card" className="absolute inset-0" />
          {listing.status === 'sold' && soldOverlay}
          {eventPast && (
            <div className="absolute top-2 right-2 z-[5] bg-black/45 text-white text-[10px] px-2 py-0.5 rounded-full">
              Terminado
            </div>
          )}
        </div>
        <div className="h-[90px] shrink-0 px-2.5 pt-1.5 pb-2">
          {(listing.price > 0 || listing.is_free) && (
            <p className="text-[15px] font-bold text-gray-900 leading-tight">
              {formattedPrice}
            </p>
          )}
          {eventSubtitle && (
            <p className="text-[13px] text-gray-700 line-clamp-2 leading-snug">
              {eventSubtitle}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-gray-400">{timeAgo(listing.created_at)}</span>
          </div>
        </div>
      </CardShell>
    )
  }

  // ── Standard card (products, services) ───────────────────────────
  return (
    <CardShell id={listing.id}>
      {/* Image area — 4:5 media slot, same as every variant. */}
      <div className="relative aspect-[4/5] bg-gray-100 shrink-0">
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
      {/* Content — fixed-height text area (h-[90px], uniform grid):
          price + title line-clamp-1 + seller/time meta. Nothing is
          bottom-pinned (mt-auto); the slack below the meta row is
          the same on every product card, so rows end even. */}
      <div className="h-[90px] shrink-0 px-2.5 pt-1.5 pb-2 flex flex-col">
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
        {/* Meta + engagement on one compact row — the seller name
            links to their profile (or store page), so a buyer can
            reach the seller without opening the listing first. */}
        <div className="flex items-center justify-between gap-1.5 mt-1">
          <span className="text-xs text-gray-500 truncate flex items-center gap-1 min-w-0">
            {listing.store && <Store className="h-2.5 w-2.5 shrink-0" />}
            {sellerName ? (
              <span
                role="link"
                tabIndex={0}
                onClick={goToSeller}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sellerHref) router.push(sellerHref)
                }}
                className="truncate hover:underline cursor-pointer"
              >
                {sellerName}
              </span>
            ) : (
              <span className="truncate">{listing.location}</span>
            )}
            <span className="shrink-0">· {timeAgo(listing.created_at)}</span>
          </span>
        </div>
      </div>
    </CardShell>
  )
}
