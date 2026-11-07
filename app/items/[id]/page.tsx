// Items engine — the item view (/items/[id]).
//
// One offering (business + kind), all about it: every photo of it
// taken by other users, the business it came from, the other users'
// posts about it, and a comment section for this particular item.
// This is the item page the v1.1 brief deferred as "later" (§13-5),
// and the payoff of the homepage carousel.
//
// Cold start: the page only renders for a visible offering. Photos
// come only from ACTIVE mentioning listings, primary tags first —
// a photo only evidences the item(s) it shows. Comments live in
// item_comments (migration 041); pre-041 the page renders without
// the comment form and nothing breaks.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CommunityFeed } from '@/components/home/community-feed'
import { ItemCommentSection } from '@/components/items/item-comment-section'
import { fetchItemsEvidence } from '@/lib/items/evidence'
import { Camera, Tag } from 'lucide-react'
import type { Metadata } from 'next'
import type { ItemComment, ListingWithImages } from '@/lib/types/database'

type ItemRow = {
  id: string
  business_id: string
  kind_id: string
  status: string
  origin: string
  created_at: string
  kind: { id?: string; name?: string; slug?: string } | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const admin = createAdminClient()
  if (!admin) return { title: 'Artículo | Ventas Tecate' }
  const { data } = await admin
    .from('items')
    .select('id, kind:item_kinds(name), business:businesses(name)')
    .eq('id', id)
    .maybeSingle()
  const row = data as {
    kind?: { name?: string } | null
    business?: { name?: string } | null
  } | null
  if (!row?.kind?.name || !row?.business?.name) {
    return { title: 'Artículo no encontrado | Ventas Tecate' }
  }
  return {
    // No "| Ventas Tecate" suffix here — the layout's title template
    // adds it (PR #80 lesson: including it renders it twice).
    title: `${row.kind.name} en ${row.business.name}`,
    description: `${row.kind.name} de ${row.business.name} en Ventas Tecate: fotos, publicaciones y comentarios de la comunidad.`,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ventastecate.com'}/items/${id}`,
    },
  }
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: itemId } = await params
  const admin = createAdminClient()
  if (!admin) notFound()

  const { data: itemRow } = await admin
    .from('items')
    .select('id, business_id, kind_id, status, origin, created_at, kind:item_kinds(id, name, slug)')
    .eq('id', itemId)
    .maybeSingle()
  const item = itemRow as ItemRow | null
  if (!item || item.status !== 'visible' || !item.kind?.name) notFound()

  const { data: businessRow } = await admin
    .from('businesses')
    .select('id, name, category, city, location, image_url')
    .eq('id', item.business_id)
    .maybeSingle()
  const business = businessRow as {
    id: string
    name: string
    category: string | null
    city: string | null
    location: string | null
    image_url: string | null
  } | null
  if (!business) notFound()

  const evidence = await fetchItemsEvidence(admin, [itemId])
  const ev = evidence.get(itemId) ?? {
    mentionCount: 0,
    contributors: 0,
    photoUrl: null,
    latestMentionAt: null,
    listingIds: [],
  }

  // Mentioning listings: ACTIVE only, primary tags first, then
  // newest. The tag rows carry is_primary; the listings carry the
  // photos and the author.
  const { data: tagRows } = await admin
    .from('listing_item_tags')
    .select('listing_id, is_primary')
    .eq('item_id', itemId)
  const primaryIds = new Set(
    ((tagRows || []) as { listing_id: string; is_primary: boolean }[])
      .filter((t) => t.is_primary)
      .map((t) => t.listing_id),
  )
  let mentionListings: ListingWithImages[] = []
  if (ev.listingIds.length > 0) {
    const { data: listings } = await admin
      .from('listings')
      .select(
        `*,
        images:listing_images(id, image_url, order_index),
        profile:profiles(id, username, display_name, avatar_url),
        store:stores(id, slug, name, avatar_url)`,
      )
      .in('id', ev.listingIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20)
    mentionListings = ((listings || []) as ListingWithImages[]).sort((a, b) => {
      const aPrimary = primaryIds.has(a.id) ? 0 : 1
      const bPrimary = primaryIds.has(b.id) ? 0 : 1
      return (
        aPrimary - bPrimary ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    })
  }

  // All photos of this item, from every mentioning listing: primary
  // listings first, then newest; within a listing, by order_index.
  const photos: { url: string; listingId: string; listingTitle: string }[] = []
  for (const listing of mentionListings) {
    const images = [...(listing.images || [])]
      .filter((img) => img.image_url)
      .sort((a, b) => a.order_index - b.order_index)
    for (const img of images) {
      photos.push({ url: img.image_url, listingId: listing.id, listingTitle: listing.title })
    }
  }
  const shownPhotos = photos.slice(0, 24)

  // Comments (migration 041): pre-041 the query fails and the page
  // renders without the comment form — never a crash.
  let comments: ItemComment[] = []
  let commentsAvailable = true
  const { data: commentRows, error: commentError } = await admin
    .from('item_comments')
    .select('id, item_id, author_id, body, created_at, profile:profiles(username, display_name, avatar_url)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true })
    .limit(100)
  if (commentError) {
    // Pre-041 (or any read failure): the page renders without the
    // comment form — never a crash.
    commentsAvailable = false
  } else {
    // The profile join can come back as an array in the inferred
    // type — normalize to the single profile, like getStories does.
    comments = ((commentRows || []) as unknown as Array<Record<string, unknown>>).map((r) => {
      const rawProfile = r.profile
      const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile
      return { ...(r as object), profile } as ItemComment
    })
  }

  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const contributeHref = currentUser
    ? `/listings/new?negocio=${business.id}&item=${item.id}`
    : `/login?redirect=/items/${item.id}`

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-3xl flex-1">
        {/* Identity: the kind, from the business it belongs to. */}
        <p className="text-xs text-gray-400 mb-2">
          <Link href={`/tipos/${item.kind.slug}`} className="hover:underline">
            {item.kind.name}
          </Link>
        </p>
        <h1 className="text-xl font-semibold leading-tight">{item.kind.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          de{' '}
          <Link href={`/businesses/${business.id}`} className="font-medium text-gray-900 hover:underline">
            {business.name}
          </Link>
          {[business.category, business.city || business.location].filter(Boolean).length > 0 &&
            ` · ${[business.category, business.city || business.location].filter(Boolean).join(' · ')}`}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {ev.contributors > 0
            ? `Mencionado por ${ev.contributors} ${ev.contributors === 1 ? 'persona' : 'personas'} · ${ev.mentionCount} ${ev.mentionCount === 1 ? 'mención' : 'menciones'}`
            : ev.mentionCount > 0
              ? `${ev.mentionCount} ${ev.mentionCount === 1 ? 'mención' : 'menciones'}`
              : item.origin === 'owner_claim'
                ? 'Agregado por el dueño · Sin menciones todavía'
                : 'Agregado por la comunidad · Sin menciones todavía'}
        </p>

        {/* Contribute: add your photo. Links into the posting flow
            with this business + item pre-tagged (?negocio=&item=) —
            no separate upload flow. */}
        <Link
          href={contributeHref}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <Camera className="h-4 w-4" />
          Agrega tu foto
        </Link>

        {/* All photos of this item, from every user who posted it. */}
        <section className="mt-8">
          <h2 className="text-base font-semibold mb-3">Fotos</h2>
          {shownPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {shownPhotos.map((photo, i) => (
                <Link
                  key={`${photo.listingId}-${i}`}
                  href={`/listings/${photo.listingId}`}
                  className="block"
                  title={photo.listingTitle}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.listingTitle}
                    className="aspect-square w-full rounded-lg object-cover hover:opacity-90 transition-opacity"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Aún no hay fotos de este artículo.
            </p>
          )}
        </section>

        {/* Other users' posts about this item. */}
        {mentionListings.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold mb-3">Publicaciones que lo mencionan</h2>
            <CommunityFeed
              initialListings={mentionListings}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            />
          </section>
        )}
        {mentionListings.length === 0 && (
          <p className="text-xs text-gray-400 mt-8">
            Aún no hay publicaciones que mencionen este artículo.
          </p>
        )}

        {/* Per-item comments. */}
        <ItemCommentSection
          itemId={item.id}
          initialComments={comments}
          commentsAvailable={commentsAvailable}
          currentUserId={currentUser?.id ?? null}
        />
      </main>
      <Footer />
    </div>
  )
}
