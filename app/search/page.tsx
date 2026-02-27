import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { SearchFilters } from '@/components/search/search-filters'
import { ListingWithImages } from '@/lib/types/database'

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    location?: string
    minPrice?: string
    maxPrice?: string
    sort?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const supabase = await createClient()
  const { q, category, location, minPrice, maxPrice, sort } = await searchParams

  // Build query
  let query = supabase
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
      ),
      store:stores(
        id,
        slug,
        name
      )
    `)
    .eq('status', 'active')

  // Apply filters
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  }

  if (category) {
    query = query.eq('category', category)
  }

  if (location) {
    query = query.ilike('location', `%${location}%`)
  }

  if (minPrice) {
    query = query.gte('price', parseFloat(minPrice))
  }

  if (maxPrice) {
    query = query.lte('price', parseFloat(maxPrice))
  }

  // Apply sorting
  if (sort === 'price_asc') {
    query = query.order('price', { ascending: true })
  } else if (sort === 'price_desc') {
    query = query.order('price', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data: listings } = await query
    .limit(50)

  const listingsWithImages: ListingWithImages[] = listings || []

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-1">
            {q ? `Resultados para "${q}"` : 'Buscar Anuncios'}
          </h1>
          <p className="text-sm text-gray-600">
            {listingsWithImages.length} {listingsWithImages.length === 1 ? 'resultado' : 'resultados'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <SearchFilters
              initialQuery={q}
              initialCategory={category}
              initialLocation={location}
              initialMinPrice={minPrice}
              initialMaxPrice={maxPrice}
            />
          </aside>

          {/* Results Grid */}
          <div className="lg:col-span-3">
            {listingsWithImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {listingsWithImages.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-2">
                  No se encontraron resultados
                </p>
                <p className="text-sm text-gray-400">
                  Intenta ajustar tus filtros
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
