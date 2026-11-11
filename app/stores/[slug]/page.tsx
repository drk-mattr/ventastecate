import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Store, MapPin, MessageSquare } from 'lucide-react'

export default async function StoreProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // Get store with owner profile
  const { data: store } = await supabase
    .from('stores')
    .select('*, owner:profiles!owner_id(id, username, display_name, avatar_url)')
    .eq('slug', slug)
    .single()

  if (!store) {
    notFound()
  }

  // Get store's active listings
  const { data: listings } = await supabase
    .from('listings')
    .select(`
      *,
      images:listing_images(
        id,
        image_url,
        order_index
      ),
      profile:profiles(
        id,
        username,
        display_name
      )
    `)
    .eq('store_id', store.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // Check if current user is the owner
  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === store.owner_id

  // Get business entity linked to this store (for mentions)
  const { data: linkedBusiness } = await supabase
    .from('businesses')
    .select('id, mention_count')
    .eq('store_id', store.id)
    .single()

  // Get listings that mention this business
  let mentionedListings: typeof listings = null
  if (linkedBusiness) {
    const { data: mentionData } = await supabase
      .from('listings')
      .select(`
        *,
        images:listing_images(id, image_url, order_index),
        profile:profiles(id, username, display_name)
      `)
      .eq('tagged_business_id', linkedBusiness.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(12)
    mentionedListings = mentionData
  }

  const memberSince = new Date(store.created_at).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Store Header */}
        <div className="border-b pb-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative h-20 w-20 rounded-xl bg-gray-200 flex items-center justify-center overflow-hidden">
              {store.avatar_url ? (
                <Image
                  src={store.avatar_url}
                  alt={store.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <Store className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-1">{store.name}</h1>
              {store.description && (
                <p className="text-sm text-gray-700 mb-3">{store.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {store.location && (
                  <>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{store.location}</span>
                    <span>•</span>
                  </>
                )}
                <span>{listings?.length || 0} anuncios</span>
                <span>•</span>
                <span>Desde {memberSince}</span>
              </div>
              {store.owner && (
                <p className="text-xs text-gray-500 mt-2">
                  Por{' '}
                  <Link
                    href={`/users/${(store.owner as { username: string }).username}`}
                    className="text-gray-900 hover:underline"
                  >
                    {(store.owner as { display_name: string }).display_name}
                  </Link>
                </p>
              )}
            </div>
            {isOwner && (
              <Button asChild size="sm">
                <Link href={`/stores/${store.slug}/edit`}>Editar Tienda</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Store's Listings */}
        <div>
          <h2 className="text-base font-medium mb-4 text-gray-700">Anuncios</h2>
          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-start">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <EmptyState
              surface
              message={isOwner ? 'Tu tienda no tiene anuncios activos' : 'Esta tienda no tiene anuncios activos'}
              actionLabel={isOwner ? 'Crear anuncio' : undefined}
              actionHref={isOwner ? '/listings/new' : undefined}
            />
          )}
        </div>

        {/* Mentions Section */}
        {mentionedListings && mentionedListings.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-medium mb-4 text-gray-700 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              Mencionado en
              {linkedBusiness && linkedBusiness.mention_count > 0 && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {linkedBusiness.mention_count}
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-start">
              {mentionedListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
