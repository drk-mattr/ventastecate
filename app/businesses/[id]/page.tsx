import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Store, MapPin, BadgeCheck } from 'lucide-react'
import { BusinessEngagementBar } from '@/components/businesses/business-engagement-bar'
import { BusinessOfferings } from '@/components/businesses/business-offerings'
import { BusinessPhotoGallery } from '@/components/businesses/business-photo-gallery'
import { BusinessReviews } from '@/components/businesses/business-reviews'
import { BusinessReviewOpener } from '@/components/businesses/review-opener'
import { ReviewStars } from '@/components/businesses/review-stars'
import type { BusinessReview } from '@/lib/types/database'
import { ContributionFlag } from '@/components/businesses/contribution-flag'
import { getRegionForTown } from '@/lib/business-regions'
import type { Metadata } from 'next'

const CONTRIBUTION_FIELD_LABEL: Record<string, string> = {
  phone: 'Teléfono',
  address: 'Dirección',
  hours: 'Horario',
  category: 'Categoría',
  website: 'Web',
}

// Per-business share card (Open Graph / Twitter): the business's name,
// category and town, with its main photo as the share image — the same
// pattern the listing pages already use. Businesses without photos get
// the plain card (no image).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, category, city, location')
    .eq('id', id)
    .single()

  if (!business) {
    return {
      title: 'Negocio no encontrado | Ventas Tecate',
    }
  }

  const town = business.city || business.location || 'Tecate'
  const { data: photos } = await supabase
    .from('business_images')
    .select('image_url')
    .eq('business_id', id)
    .order('order_index', { ascending: true })
    .limit(1)
  const primaryImage = photos?.[0]?.image_url ?? null
  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ventastecate.com'}/businesses/${id}`
  const description = business.category
    ? `${business.name} — ${business.category} en ${town}. Descubre qué ofrecen y las publicaciones que lo mencionan en Ventas Tecate.`
    : `${business.name} en ${town} — Negocio del índice de Ventas Tecate.`

  return {
    // No "| Ventas Tecate" suffix here — the layout's title template
    // adds it. (Including it would render it twice in the tab.)
    title: `${business.name} · ${town}`,
    description,
    openGraph: {
      title: business.name,
      description,
      url,
      siteName: 'Ventas Tecate',
      images: primaryImage
        ? [
            {
              url: primaryImage,
              width: 1200,
              height: 630,
              alt: business.name,
            },
          ]
        : [],
      locale: 'es_MX',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: business.name,
      description,
      images: primaryImage ? [primaryImage] : [],
    },
    alternates: {
      canonical: url,
    },
  }
}

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ review?: string }>
}) {
  const { id } = await params
  // Deep link: ?review=1 opens the page with the review pop-up open.
  const sp = (await searchParams) ?? {}
  const openReview = sp.review === '1'
  const supabase = await createClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('*, store:stores(id, slug, name, avatar_url)')
    .eq('id', id)
    .single()
  if (!business) notFound()

  // Children: listings that mention this business, via the shortcut column
  // or the junction table, deduplicated, newest first.
  const { data: tagged } = await supabase
    .from('listings')
    .select('*, images:listing_images(id, image_url, order_index), profile:profiles(id, username, display_name)')
    .eq('tagged_business_id', id).eq('status', 'active')
  const { data: junction } = await supabase
    .from('listing_business_tags').select('listing_id').eq('business_id', id)
  let junctionListings: typeof tagged = []
  const junctionIds = (junction || []).map((j) => j.listing_id)
  if (junctionIds.length) {
    const { data } = await supabase
      .from('listings')
      .select('*, images:listing_images(id, image_url, order_index), profile:profiles(id, username, display_name)')
      .in('id', junctionIds).eq('status', 'active')
    junctionListings = data
  }
  const { data: photos } = await supabase
    .from('business_images').select('image_url, order_index').eq('business_id', id).order('order_index', { ascending: true })
  const photoUrls = (photos || []).map((p) => p.image_url).filter(Boolean)
  if (photoUrls.length === 0 && business.image_url) photoUrls.push(business.image_url)

  const byId = new Map<string, NonNullable<typeof tagged>[number]>()
  for (const l of [...(tagged || []), ...(junctionListings || [])]) byId.set(l.id, l)
  const listings = [...byId.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  let initialFollowing = false, initialLiked = false
  if (currentUser) {
    const [{ data: follow }, { data: like }] = await Promise.all([
      supabase.from('business_follows').select('id').eq('business_id', id).eq('user_id', currentUser.id).maybeSingle(),
      supabase.from('business_likes').select('id').eq('business_id', id).eq('user_id', currentUser.id).maybeSingle(),
    ])
    initialFollowing = !!follow; initialLiked = !!like
  }

  const claimedBy = (business as { claimed_by?: string | null }).claimed_by ?? null
  const claimed = Boolean(claimedBy)
  const hours = (business as { hours?: string | null }).hours ?? null
  const website = (business as { website?: string | null }).website ?? null

  // Latest community contribution, for attribution under the info.
  // Pre-032 the table is missing and the query errors; treat as none.
  let latestContribution: { id: string; field: string; created_at: string; username: string | null } | null = null
  const { data: contrib, error: contribError } = await supabase
    .from('business_contributions')
    .select('id, field, user_id, created_at')
    .eq('business_id', id)
    .is('flagged_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!contribError && contrib) {
    let username: string | null = null
    if (contrib.user_id) {
      const { data: contributor } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', contrib.user_id)
        .single()
      username = contributor?.username ?? null
    }
    latestContribution = { id: contrib.id, field: contrib.field, created_at: contrib.created_at, username }
  }

  // Does the signed-in user already have a pending claim request here?
  // Pre-032 the table is missing and the query errors; treat as none.
  let pendingClaim = false
  if (currentUser && !claimed) {
    const { data: claim } = await supabase
      .from('business_claim_requests')
      .select('id')
      .eq('business_id', id)
      .eq('user_id', currentUser.id)
      .eq('status', 'pending')
      .maybeSingle()
    pendingClaim = Boolean(claim)
  }

  // Reviews (migration 042): pre-042 the query fails and the page
  // renders without the reviews section — never a crash.
  let reviews: BusinessReview[] = []
  let reviewsAvailable = true
  const { data: reviewRows, error: reviewError } = await supabase
    .from('business_reviews')
    .select('id, business_id, user_id, rating, body, created_at, updated_at, profile:profiles(username, display_name, avatar_url)')
    .eq('business_id', id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (reviewError) {
    reviewsAvailable = false
  } else {
    // The profile join can come back as an array in the inferred
    // type — normalize to the single profile, like getStories does.
    reviews = ((reviewRows || []) as unknown as Array<Record<string, unknown>>).map((r) => {
      const rawProfile = r.profile
      const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile
      return { ...(r as object), profile } as BusinessReview
    })
  }
  const reviewCount = reviews.length
  const reviewAverage =
    reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0
  const isOwner = Boolean(currentUser && claimedBy && claimedBy === currentUser.id)
  const myReview = currentUser ? reviews.find((r) => r.user_id === currentUser.id) : undefined

  // Follow / like, rendered once and placed either over the gallery
  // (when there are photos) or in the identity block (when not).
  const engagementBar = (
    <BusinessEngagementBar
      businessId={business.id}
      businessName={business.name}
      businessTown={business.city || business.location || 'Tecate'}
      initialFollowing={initialFollowing}
      initialLiked={initialLiked}
      followersCount={business.followers_count ?? 0}
      likesCount={business.likes_count ?? 0}
      claimedBy={claimedBy}
      isOwner={isOwner}
    />
  )

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Photos first: they are the hook. The follow / like actions sit
            in their own row ABOVE the photos — never over the images. */}
        <div className="mb-4 flex justify-end">{engagementBar}</div>

        <BusinessPhotoGallery photos={photoUrls} name={business.name} />

        {/* Identity below the photos: avatar, name, info, links. */}
        <div className="border-b pb-6 mb-6">
          <div className="flex flex-wrap items-start gap-4">
            {/* The business's main photo is its avatar — the gray Store tile
                read as "no photo" even with a full gallery below it. Icon
                only when truly no photo. */}
            {business.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.image_url} alt="" className="h-16 w-16 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Store className="h-7 w-7 text-gray-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold mb-1">{business.name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                {(business.city || business.location) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{business.city || business.location}</span>}
                {business.city && getRegionForTown(business.city) && <span>{getRegionForTown(business.city)}</span>}
                {business.category && <span>{business.category}</span>}
                {business.address && <span>{business.address}</span>}
                {business.phone && <span>{business.phone}</span>}
                {hours && <span>{hours}</span>}
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">
                    {website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                <span>{business.mention_count ?? 0} {(business.mention_count ?? 0) === 1 ? 'mención' : 'menciones'}</span>
              </div>
              {/* Reviews aggregate + the visible "Opinar" entry point.
                  The aggregate alone gave no way in when there were no
                  reviews yet — the Opiniones section sits at the bottom
                  of a long page — so the button lives here, next to it,
                  and ?review=1 opens its pop-up on load. */}
              {reviewsAvailable && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {reviewCount > 0 ? (
                    <p className="flex items-center gap-2 text-sm">
                      <ReviewStars value={reviewAverage} />
                      <a href="#opiniones" className="text-gray-600 hover:underline">
                        {reviewAverage.toFixed(1)} · {reviewCount} {reviewCount === 1 ? 'opinión' : 'opiniones'}
                      </a>
                    </p>
                  ) : (
                    <span className="text-sm text-gray-400">Aún no hay opiniones</span>
                  )}
                  <BusinessReviewOpener
                    businessId={id}
                    businessName={business.name}
                    currentUserId={currentUser?.id ?? null}
                    isOwner={isOwner}
                    myReview={myReview ?? null}
                    defaultOpen={openReview}
                  />
                </div>
              )}
              {business.store ? (
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                  <BadgeCheck className="h-4 w-4 text-orange-600" />
                  Negocio registrado: <Link href={`/stores/${business.store.slug}`} className="text-gray-900 hover:underline">{business.store.name}</Link>
                </p>
              ) : claimed ? (
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                  <BadgeCheck className="h-4 w-4 text-orange-600" />
                  Negocio reclamado
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-2">Negocio del índice, agregado por la comunidad. El dueño aún no lo ha reclamado.</p>
              )}
              {latestContribution && (
                <p className="text-xs text-gray-400 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>
                    {CONTRIBUTION_FIELD_LABEL[latestContribution.field] || 'Dato'} agregado por{' '}
                    {latestContribution.username ? `@${latestContribution.username}` : 'la comunidad'}
                    {' · '}
                    {new Date(latestContribution.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </span>
                  <ContributionFlag businessId={id} contributionId={latestContribution.id} />
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <Link href={`/businesses/${id}/agregar-informacion`} className="text-gray-500 underline hover:text-gray-700">
                  Agregar información
                </Link>
                {!claimed && (
                  pendingClaim ? (
                    <span className="text-gray-400">Solicitud de reclamo en revisión</span>
                  ) : (
                    <Link href={`/businesses/${id}/reclamar`} className="text-gray-500 underline hover:text-gray-700">
                      Reclamar este negocio
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Items engine (§8, 034B): what they offer here, with evidence
            levels, plus the affordance to add an offering without a
            full publication. Sits above "Publicaciones que lo
            mencionan", which stays the evidence below it. */}
        <BusinessOfferings businessId={id} businessCategory={business.category} />

        <h2 className="text-base font-medium mb-4 text-gray-700">Publicaciones que lo mencionan</h2>
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <EmptyState surface message="Aún no hay publicaciones que mencionen este negocio" actionLabel="Publicar un anuncio" actionHref="/listings/new" />
        )}

        {reviewsAvailable && (
          <BusinessReviews
            businessId={id}
            initialReviews={reviews}
            currentUserId={currentUser?.id ?? null}
            isOwner={isOwner}
          />
        )}
      </main>
    </div>
  )
}
