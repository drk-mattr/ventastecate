'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Wrench, Megaphone, Store, Play, ThumbsUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ListingWithImages } from '@/lib/types/database'
import { formatPrice } from '@/lib/listings/format-price'
import { formatEventRange, isEventPast, eventDateChip } from '@/lib/listings/event-dates'
import { resolveCardColor } from '@/lib/listings/card-colors'
import { ListingTitleCard } from './listing-title-card'
import { VideoPlayer } from './video-player'
import { nativeVideoOf, listingVideoPublicUrl } from '@/lib/video/types'
import { newsLede, splitSource, sourceDomain } from '@/lib/listings/article-helpers'

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
// plain red letters as the top strip INSIDE the 4:5 media slot, the
// image inset with a generous white margin on all sides — no banner
// strip. The feed photo is black-and-white (grayscale) and shows
// FULLY (object-contain in the media slot — it is the evidence for
// identifying the animal, so it is never cropped); the card shows
// heading + image + title + time only, no description (the full
// description stays on the detail page). The heading lives inside
// the slot, so a lost-post card is exactly the same height as every
// other card in its row — the photo (or title card) gives up ~28px
// of slot height to the heading strip instead. The detail-page hero
// keeps full color and full bleed, because color matters for
// actually identifying the animal.
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

// Uniform grid construction (2026-11-11, tightened 2026-11-18): every
// variant is the SAME height in a grid row, by construction — media
// slot aspect-[4/5] of the column width + a fixed h-[78px] text area,
// top-aligned, nothing bottom-pinned, no mt-auto. The 78px fits the
// tallest standard text content (2-line title + meta row, ~73px);
// shorter variants carry the slack as bottom padding inside their
// text block. The card is only as tall as those two blocks: no
// h-full, so a tall neighbor cannot stretch it (the grids use
// items-start). Total: 5/4 W + 78px. Exceptions, all compensated to
// the same total: editorial news cards (non-lost only) use a 3:2
// media slot (2/3 W) with the text area at 7/12 W + 78px, and
// date-first events keep a 90px text area (a priced event needs
// ~88px) with the media slot trimmed 12px (5/4 W − 12px) to match.
// Lost posts are no exception: the SE BUSCA heading sits INSIDE
// the media slot as its top strip (2026-11-17).
function CardShell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Link href={`/listings/${id}`} className="group">
      <div className="flex flex-col rounded-xl border bg-white hover:shadow-md transition-shadow overflow-hidden">
        {children}
      </div>
    </Link>
  )
}

// Editorial news text area (non-lost news only, 2026-11-17; 3:2 media
// since the 2026-11-18 tighten): the media slot is 3:2 (2/3 W), so
// this area is taller than the 78px of every other variant by
// exactly the height the photo lost vs 4:5 — 7/12 × the column
// width — keeping the card's total height identical to its
// row-mates: 2/3 W + (7/12 W + 78px) = 5/4 W + 78px. The height
// is padding-bottom (percentages resolve against the card width),
// with the content absolutely positioned inside; content is
// top-aligned, nothing bottom-pinned. Worst-case content is ~161px
// (eyebrow + 3-line headline + 2-line lede + source line), so the
// area fits it at any card width ≥ ~143px (viewport ≥ ~330px).
// Contents: red NOTICIA marker + category eyebrow, serif headline
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
    <div className="relative w-full shrink-0 pb-[calc(58.33%+78px)]">
      <div className="absolute inset-0 px-2.5 pt-2 pb-2 flex flex-col">
        <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5 leading-none">
          <span className="text-red-600">Noticia</span>
          {listing.category && (
            <span className={`ml-1 ${categoryColor}`}>· {listing.category}</span>
          )}
        </p>
        <h3 className="font-news font-bold text-[16px] leading-snug line-clamp-3 mb-1.5 group-hover:underline">
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
    // SE BUSCA in red letters as the top strip INSIDE the media
    // slot, the photo inset with a white margin, grayscale,
    // object-contain (it shows FULLY — it is the evidence for
    // identifying the animal). This branch is untouched by the
    // editorial news change below: same 4:5 slot, same h-[78px]
    // text area, and the card now matches its row-mates exactly.
    if (isLostPost) {
      if (!primaryImage && !nativeVideo) {
        return (
          <CardShell id={listing.id}>
            <div className="relative aspect-[4/5] w-full shrink-0 bg-white flex flex-col">
              {SE_BUSCA_HEADING}
              <div className="relative flex-1 min-h-0 mx-4 mb-2">
                <ListingTitleCard
                  title={listing.title}
                  cardColor={listing.card_color}
                  size="card"
                  className="absolute inset-0"
                />
                {listing.status === 'sold' && soldOverlay}
              </div>
            </div>
            <div className="h-[78px] shrink-0 px-2.5 pt-1.5 pb-2">
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-400">{timeAgo(listing.created_at)}</span>
              </div>
            </div>
          </CardShell>
        )
      }

      return (
        <CardShell id={listing.id}>
          {/* Lost post: a printed-poster look — SE BUSCA in red
             letters as the top strip INSIDE the 4:5 media slot, the
             photo inset with a white margin below it. The photo
             shows FULLY (object-contain) — it is the evidence for
             identifying the animal. No category eyebrow — the
             heading says what it is. The heading strip takes ~28px
             from the slot, so the card is exactly the same height
             as every other card in its row. A native video takes
             the same slot below the heading. */}
          <div className="relative aspect-[4/5] w-full shrink-0 bg-white flex flex-col">
            {SE_BUSCA_HEADING}
            {nativeVideo && nativeVideoUrl ? (
              /* Native clip: muted autoplay in view, tap for sound.
                 The photo (if any) stays on the detail page gallery.
                 The clip letterboxes (object-contain) in the slot —
                 it shows fully, never cropped, at the uniform height. */
              <VideoPlayer
                src={nativeVideoUrl}
                posterUrl={nativeVideo.thumbnailUrl}
                durationSeconds={nativeVideo.durationSeconds}
                title={listing.title}
                autoplayInView
                className="flex-1 min-h-0 w-full"
              />
            ) : (
              <div className="relative flex-1 min-h-0 mx-4 mb-2">
                <Image src={primaryImage!} alt={listing.title} fill className="object-contain grayscale"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" />
                {listing.status === 'sold' && soldOverlay}
              </div>
            )}
          </div>
          <div className="h-[78px] shrink-0 px-2.5 pt-1.5 pb-2">
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
    // slot is 3:2 — a landscape news photo now shows as a landscape
    // photo instead of a portrait crop — and the text area below carries the editorial treatment: red NOTICIA
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

    // ── Avisos (Anuncios Comunitarios): a community notice, not a
    // news story — text-first, NO photo slot at all. The whole card
    // is the text area, at exactly the same total height as its
    // row-mates (the padding trick from EditorialNewsTextArea, full
    // 5/4 W + 78px). AVISO label + location, serif title, the
    // notice itself, time pinned to the bottom. A photo on the
    // listing still shows on the detail page — the card just
    // doesn't lead with it.
    if (listing.category === 'Anuncios Comunitarios') {
      return (
        <CardShell id={listing.id}>
          <div className="relative w-full shrink-0 pb-[calc(125%+78px)]">
            <div className="absolute inset-0 px-2.5 pt-2.5 pb-2 flex flex-col">
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5 leading-none">
                <span className="text-red-600">Aviso</span>
                {listing.location && (
                  <span className="ml-1 text-gray-500">· {listing.location}</span>
                )}
              </p>
              <h3 className="font-forum font-bold text-[16px] leading-snug line-clamp-3 mb-1.5 group-hover:underline">
                {listing.title}
              </h3>
              {lede && (
                <p className="text-[13px] text-gray-600 leading-snug line-clamp-4">{lede}</p>
              )}
              <div className="flex items-center gap-2 mt-auto">
                <span className="text-[10px] text-gray-400">{timeAgo(listing.created_at)}</span>
              </div>
            </div>
          </div>
        </CardShell>
      )
    }

    // Photo-less news: the orange title card fills the 3:2 media
    // slot instead of 4:5 (title still white on orange, same
    // treatment, just wider/shorter). A native video is not
    // photo-less — it takes the media slot below instead.
    if (!primaryImage && !nativeVideo) {
      return (
        <CardShell id={listing.id}>
          {/* Inset (2026-11-17): the image does not bleed to the card
              edges — a blog/news figure with a white margin and
              rounded corners. The slot keeps its exact 3:2 box, so
              the card height is unchanged; the margin lives inside
              it. Same treatment for the photo and the clip below. */}
          <div className="relative aspect-[3/2] w-full shrink-0 p-2.5">
            <div className="relative h-full w-full rounded-lg overflow-hidden">
              <ListingTitleCard
                title={listing.title}
                cardColor={listing.card_color}
                size="card"
                className="absolute inset-0"
              />
              {listing.status === 'sold' && soldOverlay}
            </div>
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
             The clip letterboxes (object-contain) in the 3:2 slot —
             it shows fully, never cropped, at the uniform height. */
          <div className="relative aspect-[3/2] w-full shrink-0 p-2.5">
            <VideoPlayer
              src={nativeVideoUrl}
              posterUrl={nativeVideo.thumbnailUrl}
              durationSeconds={nativeVideo.durationSeconds}
              title={listing.title}
              autoplayInView
              className="h-full w-full rounded-lg overflow-hidden"
            />
          </div>
        ) : (
          <div className="relative aspect-[3/2] w-full shrink-0 p-2.5">
            <div className="relative h-full w-full rounded-lg overflow-hidden">
              <Image src={primaryImage!} alt={listing.title} fill className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" />
              {listing.status === 'sold' && soldOverlay}
            </div>
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
        <div className="h-[78px] shrink-0 px-2.5 pt-1.5 pb-2">
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

  // ── Photo-less event: DATE-FIRST (2026-11-17). The orange block
  // leads with the calendar — a white date chip (day + month) and an
  // EVENTO · town label up top, the serif title at the bottom — so
  // the card reads as an event at a glance, not as an item for sale.
  // The text area keeps 90px (a priced event needs ~88px: price +
  // date line + venue + time), so the media slot is trimmed 12px
  // (pb-[calc(125%-12px)]) to keep the total at 5/4 W + 78px like
  // every row-mate. The text area splits what used to be one joined
  // subtitle: the date line bold on its own line, the venue below
  // it. Poster events are untouched — the poster already carries
  // the date.
  if (listingType === 'event' && !primaryImage) {
    const chip = eventDateChip(eventStartsAt)
    const eventColor = resolveCardColor(listing.card_color).hex
    return (
      <CardShell id={listing.id}>
        <div className="relative w-full shrink-0 pb-[calc(125%-12px)]" style={{ backgroundColor: eventColor }}>
          <div className="absolute inset-0 flex flex-col p-3">
            <div className="flex items-start gap-2">
              {chip && (
                <div className="bg-white rounded-lg px-2 py-1 text-center leading-none shrink-0">
                  <div className="text-[18px] font-extrabold text-gray-900 leading-none">{chip.day}</div>
                  <div className="text-[9px] font-bold tracking-wide text-gray-900 mt-0.5">{chip.month}</div>
                </div>
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 pt-1">
                Evento · {listing.location}
              </span>
            </div>
            <div className="flex-1" />
            <h3 className="font-forum font-bold text-white text-[19px] leading-snug line-clamp-4">
              {listing.title}
            </h3>
          </div>
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
          {eventDateLine && (
            <p className="text-[13px] font-semibold text-gray-900 line-clamp-1 leading-snug">
              {eventDateLine}
            </p>
          )}
          {(listing.event_venue || listing.location) && (
            <p className="text-[13px] text-gray-700 line-clamp-1 leading-snug">
              {listing.event_venue || listing.location}
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
      {/* Content — fixed-height text area (h-[78px], uniform grid):
          price + title line-clamp-1 + seller/time meta. Nothing is
          bottom-pinned (mt-auto); the slack below the meta row is
          the same on every product card, so rows end even. */}
      <div className="h-[78px] shrink-0 px-2.5 pt-1.5 pb-2 flex flex-col">
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
