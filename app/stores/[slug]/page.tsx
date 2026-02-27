import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { Button } from '@/components/ui/button'

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
            <div className="relative h-20 w-20 rounded-lg bg-gray-200 flex items-center justify-center text-3xl overflow-hidden">
              {store.avatar_url ? (
                <Image
                  src={store.avatar_url}
                  alt={store.name}
                  fill
                  className="object-cover"
                />
              ) : (
                '🏪'
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
                    <span>📍 {store.location}</span>
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
                    className="text-blue-600 hover:underline"
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">
                {isOwner
                  ? 'Tu tienda no tiene anuncios activos'
                  : 'Esta tienda no tiene anuncios activos'}
              </p>
              {isOwner && (
                <Button asChild size="sm" className="mt-4">
                  <Link href="/listings/new">Crear anuncio</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
