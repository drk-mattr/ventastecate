import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { ListingWithImages } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/search/search-bar'

export default async function Home() {
  const supabase = await createClient()
  
  // Fetch active listings with images and profiles
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
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(12)

  const listingsWithImages: ListingWithImages[] = listings || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        {/* Hero Section */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold text-center mb-2">
              Compra y Vende en Tecate
            </h1>
            <p className="text-gray-600 text-center mb-8">
              Tu mercado local para encontrar lo que necesitas
            </p>
            <SearchBar />
          </div>
        </div>

        {/* Listings Grid */}
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6">Anuncios Recientes</h2>
          {listingsWithImages.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listingsWithImages.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No hay anuncios disponibles en este momento.
              </p>
              <Button asChild>
                <a href="/listings/new">Publica el primer anuncio</a>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
