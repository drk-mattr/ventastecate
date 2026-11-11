import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ListingImageGallery } from '@/components/listings/listing-image-gallery'
import { ListingTitleCard } from '@/components/listings/listing-title-card'
import { CommentSection } from '@/components/listings/comment-section'
import { ListingEngagementBar } from '@/components/listings/listing-engagement-bar'
import { FollowButton } from '@/components/user/follow-button'
import { ReporterBadge } from '@/components/user/reporter-badge'
import { isLocalReporter } from '@/lib/video/types'
import {
  readingMinutes,
  splitSource,
  splitParagraphs,
  tagLinks,
  sourceDomain,
} from '@/lib/listings/article-helpers'
import type { ListingComment } from '@/lib/types/database'

/**
 * News article, Medium-style (v1, 2026-11-10). Scope: listing_type
 * === 'news' ONLY — products/events keep the marketplace detail in
 * app/listings/[id]/page.tsx. Server component; the only client
 * islands are the reused FollowButton, engagement bar and comments.
 *
 * Order is the same on all widths — this deliberately ends the
 * mobile hero-first reorder for news: an article opens with its
 * headline, like Medium.
 *
 *   tag pills → headline → byline → action row → hero → body →
 *   source footer → tagged business → action row → comments
 */
export interface NewsArticleListing {
  id: string
  title: string
  description: string
  category: string
  location: string
  city?: string | null
  card_color?: string | null
  status: string
  created_at: string
  images: { id: string; image_url: string; order_index: number }[]
  profile: {
    id: string
    username: string
    display_name: string
    avatar_url?: string | null
    is_local_reporter?: boolean | null
  }
  store: {
    id: string
    slug: string
    name: string
    avatar_url?: string | null
    location?: string | null
  } | null
}

interface NewsArticleProps {
  listing: NewsArticleListing
  comments: ListingComment[]
  currentUserId: string | null
  isOwner: boolean
  likesCount: number
  savesCount: number
  /** Pre-built video block (native clip or link embed) from the page. */
  videoBlock: ReactNode
  /** Pre-built tagged-business card from the page. */
  taggedBusinessCard: ReactNode
}

export function NewsArticle({
  listing,
  comments,
  currentUserId,
  isOwner,
  likesCount,
  savesCount,
  videoBlock,
  taggedBusinessCard,
}: NewsArticleProps) {
  const sortedImages = [...listing.images].sort((a, b) => a.order_index - b.order_index)
  const hasPhotos = sortedImages.length > 0
  const hasVideo = Boolean(videoBlock)
  // The title card carries the title, so the H1 is skipped only when
  // the hero IS a title card (no photos and no video). A video hero
  // still gets the headline above it.
  const isTitleCardHero = !hasPhotos && !hasVideo
  const isLostPost = listing.category === 'Objetos Perdidos'

  const { body, sourceUrl } = splitSource(listing.description)
  const paragraphs = splitParagraphs(body)
  const minutes = readingMinutes(body)
  const tags = tagLinks(listing)
  const shortDate = new Date(listing.created_at).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const seBuscaStrip = isLostPost ? (
    <div className="absolute top-0 inset-x-0 z-[5] bg-red-600 px-3 py-1.5 text-center text-xs font-bold uppercase tracking-[0.2em] text-white">
      Se busca
    </div>
  ) : null

  return (
    <article className="max-w-2xl mx-auto flex flex-col">
      {/* Tag pills — derived only (category + place), each tappable
          to a filtered list. They replace the category Badge +
          "Noticia / Aviso" breadcrumb row. */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {tags.map((tag) => (
            <Link
              key={tag.href}
              href={tag.href}
              className="text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1"
            >
              {tag.label}
            </Link>
          ))}
        </div>
      )}

      {/* Headline — the logo type (Fraunces, font-forum), like the
          body below it: the sans bold headline looked generic next
          to the serif article text. Same size and weight, the face
          is what changes. */}
      {!isTitleCardHero && (
        <h1 className="font-forum text-[28px] leading-[1.15] sm:text-4xl md:text-[40px] font-bold text-gray-900 mb-4">
          {listing.title}
        </h1>
      )}

      {/* Byline — 44px avatar, name + badges, Follow, reading time.
          Location left the byline: it lives in the place pill. */}
      <div className="flex items-center gap-3 pb-4">
        <div className="relative h-11 w-11 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold overflow-hidden shrink-0">
          {listing.store?.avatar_url ? (
            <Image src={listing.store.avatar_url} alt={listing.store.name} fill className="object-cover" />
          ) : listing.profile.avatar_url ? (
            <Image src={listing.profile.avatar_url} alt={listing.profile.display_name} fill className="object-cover" />
          ) : (
            <span>{(listing.store?.name || listing.profile.display_name)[0].toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {listing.store ? (
            <Link href={`/stores/${listing.store.slug}`} className="text-sm font-semibold hover:underline">
              {listing.store.name}
            </Link>
          ) : (
            <span className="flex items-center gap-2">
              <Link href={`/users/${listing.profile.username}`} className="text-sm font-semibold hover:underline">
                {listing.profile.display_name}
              </Link>
              {listing.profile.username === 'ventastecate' && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-gray-500">
                  <BadgeCheck className="h-3.5 w-3.5 text-orange-600" />
                  Cuenta oficial
                </span>
              )}
              {isLocalReporter(listing.profile) && <ReporterBadge />}
            </span>
          )}
          <p className="text-xs text-gray-500 mt-0.5">
            {minutes} min de lectura · {shortDate}
          </p>
        </div>
        {/* No Follow for store authors (no profileId follow target);
            FollowButton returns null for the author themselves. */}
        {!listing.store && <FollowButton profileId={listing.profile.id} />}
        {isOwner && (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={`/listings/${listing.id}/edit`}>Editar</Link>
          </Button>
        )}
      </div>

      {/* Action row — quiet, between hairlines. The one like/save
          control on every width now: the mobile hero overlay is gone
          for news. */}
      <div className="mb-6">
        <ListingEngagementBar
          listingId={listing.id}
          likesCount={likesCount}
          savesCount={savesCount}
          variant="article"
        />
      </div>

      {/* Hero — video takes the slot when it exists (the clip is the
          lead media); photos follow below it as supporting media.
          Otherwise the gallery, or the title card when photo-less. */}
      {hasVideo && <div className="mb-6">{videoBlock}</div>}
      {hasPhotos ? (
        <div className="relative -mx-4 sm:mx-0 mb-6 rounded-none sm:rounded-xl overflow-hidden">
          {seBuscaStrip}
          <ListingImageGallery
            images={sortedImages}
            listingTitle={listing.title}
            isSold={listing.status === 'sold'}
            listingType="news"
          />
        </div>
      ) : !hasVideo ? (
        <div className="relative -mx-4 sm:mx-0 mb-6 rounded-none sm:rounded-xl overflow-hidden">
          {seBuscaStrip}
          <ListingTitleCard
            title={listing.title}
            cardColor={listing.card_color}
            size="hero"
            className="aspect-[16/9] rounded-none sm:rounded-xl"
          />
        </div>
      ) : null}

      {/* Article body — Fraunces serif at its true 400 weight
          (the 400 file is loaded in layout.tsx — without it the
          body fell back to 500 and read too heavy), softened to
          gray-800 instead of near-black. Real paragraphs, no
          heading or list syntax in v1: the body is plain text
          from the news canvas, and the renderer must not guess
          headings. */}
      <div className="font-forum font-normal text-lg leading-[1.8] sm:text-[19px] sm:leading-[1.7] text-gray-800">
        {paragraphs.map((p, i) => (
          <p key={i} className="mb-6 last:mb-0 whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>

      {/* Source footer — the trailing "Fuente: <url>" line, split off
          the body and rendered as a linked citation (domain only).
          User-posted news has no Fuente line: nothing renders. */}
      {sourceUrl && (
        <div className="border-t border-gray-100 mt-10 pt-4">
          <p className="text-xs text-gray-500">
            Fuente:{' '}
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {sourceDomain(sourceUrl)}
            </a>
          </p>
        </div>
      )}

      {/* Tagged business — index linkage, unchanged */}
      {taggedBusinessCard && <div className="mt-6">{taggedBusinessCard}</div>}

      {/* Action row, repeated (Medium pattern) */}
      <div className="mt-6">
        <ListingEngagementBar
          listingId={listing.id}
          likesCount={likesCount}
          savesCount={savesCount}
          variant="article"
        />
      </div>

      {/* Comment section */}
      <CommentSection
        listingId={listing.id}
        initialComments={comments}
        currentUserId={currentUserId}
      />
    </article>
  )
}
