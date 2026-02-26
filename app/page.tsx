import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ListingCard } from '@/components/listings/listing-card'
import { DynamicHero } from '@/components/home/dynamic-hero'
import { ListingWithImages } from '@/lib/types/database'
import { Button } from '@/components/ui/button'

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
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section with Dynamic Location */}
        <DynamicHero />

        {/* Listings Grid */}
        <div className="container mx-auto px-4 py-6">
          <h2 className="text-base font-medium mb-4 text-gray-700">Anuncios Recientes</h2>
          {listingsWithImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {listingsWithImages.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 mb-4">
                No hay anuncios disponibles.
              </p>
              <Button asChild size="sm">
                <Link href="/listings/new">Publicar anuncio</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
