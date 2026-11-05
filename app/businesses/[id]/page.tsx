import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Store, MapPin, BadgeCheck } from 'lucide-react'
import { BusinessEngagementBar } from '@/components/businesses/business-engagement-bar'
import { BusinessPhotoGallery } from '@/components/businesses/business-photo-gallery'
import { getRegionForTown } from '@/lib/business-regions'

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <BusinessPhotoGallery photos={photoUrls} name={business.name} />
        <div className="border-b pb-6 mb-6">
          <div className="flex items-start gap-4">
            {/* The business's main photo is its avatar now that galleries
                exist — the gray Store tile read as "no photo" even with
                a full gallery above it. Icon only when truly no photo. */}
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
                <span>{business.mention_count ?? 0} {(business.mention_count ?? 0) === 1 ? 'mención' : 'menciones'}</span>
              </div>
              <div className="mt-3">
                <BusinessEngagementBar
                  businessId={business.id}
                  initialFollowing={initialFollowing}
                  initialLiked={initialLiked}
                  followersCount={business.followers_count ?? 0}
                  likesCount={business.likes_count ?? 0}
                />
              </div>
              {business.store ? (
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                  <BadgeCheck className="h-4 w-4 text-orange-600" />
                  Negocio registrado: <Link href={`/stores/${business.store.slug}`} className="text-gray-900 hover:underline">{business.store.name}</Link>
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mt-2">Negocio del índice, agregado por la comunidad. El dueño aún no lo ha reclamado.</p>
                  <p className="text-xs text-gray-400 mt-1">¿Sabes la dirección, el teléfono o el horario? <Link href="/listings/new" className="underline hover:text-gray-600">Menciónalo en una publicación</Link> y ayuda a completar este negocio.</p>
                </>
              )}
            </div>
          </div>
        </div>

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
      </main>
    </div>
  )
}
