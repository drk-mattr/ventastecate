import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { SearchFilters } from '@/components/search/search-filters'
import { ListingWithImages } from '@/lib/types/database'
import { getTranslations } from '@/lib/i18n'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    location?: string
    city?: string
    stateRegion?: string
    minPrice?: string
    maxPrice?: string
    sort?: string
    country?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const supabase = await createClient()
  const { q, category, location, city, stateRegion, minPrice, maxPrice, sort, country } = await searchParams

  // Detect user country via Cloudflare header (null in local dev)
  const headersList = await headers()
  const userCountry = headersList.get('cf-ipcountry') ?? null
  const t = getTranslations(userCountry)

  // 'all' = user opted into global search; absent = use detected country
  const isGlobal = country === 'all'
  const effectiveCountry = isGlobal ? null : (country ?? userCountry)

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
  if (city) {
    query = query.ilike('city', `%${city}%`)
  }
  if (stateRegion) {
    query = query.ilike('state_region', `%${stateRegion}%`)
  }
  if (minPrice) {
    query = query.gte('price', parseFloat(minPrice))
  }
  if (maxPrice) {
    query = query.lte('price', parseFloat(maxPrice))
  }
  if (effectiveCountry) {
    query = query.eq('country_code', effectiveCountry)
  }

  // Apply sorting
  if (sort === 'price_asc') {
    query = query.order('price', { ascending: true })
  } else if (sort === 'price_desc') {
    query = query.order('price', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data: listings } = await query.limit(50)
  const listingsWithImages: ListingWithImages[] = listings || []

  // Build toggle URL (preserve other params, flip country)
  const toggleParams = new URLSearchParams()
  if (q) toggleParams.set('q', q)
  if (category) toggleParams.set('category', category)
  if (location) toggleParams.set('location', location)
  if (city) toggleParams.set('city', city)
  if (stateRegion) toggleParams.set('stateRegion', stateRegion)
  if (minPrice) toggleParams.set('minPrice', minPrice)
  if (maxPrice) toggleParams.set('maxPrice', maxPrice)
  if (sort) toggleParams.set('sort', sort)
  if (!isGlobal) toggleParams.set('country', 'all')
  const toggleHref = `/search?${toggleParams.toString()}`

  const resultCount = listingsWithImages.length
  const resultLabel = resultCount === 1 ? t.listings.result : t.listings.results

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-4">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">
              {q ? `"${q}"` : t.hero.search}
            </h1>
            <p className="text-sm text-gray-600">
              {resultCount} {resultLabel}
              {city && ` ${t.listings.in} ${city}`}
              {stateRegion && !city && ` ${t.listings.in} ${stateRegion}`}
              {effectiveCountry && !isGlobal && !city && !stateRegion && ` ${t.listings.in} ${effectiveCountry}`}
            </p>
          </div>
          {userCountry && (
            <Link
              href={toggleHref}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors shrink-0 mt-1"
            >
              {isGlobal ? (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.listings.onlyIn} {userCountry}</span>
              ) : t.listings.seeAll}
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <SearchFilters
              initialQuery={q}
              initialCategory={category}
              initialLocation={location}
              initialCity={city}
              initialStateRegion={stateRegion}
              initialMinPrice={minPrice}
              initialMaxPrice={maxPrice}
              initialCountry={country}
            />
          </aside>

          <div className="lg:col-span-3">
            {listingsWithImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {listingsWithImages.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-2">{t.listings.noResults}</p>
                {effectiveCountry && !isGlobal && (
                  <Link href={toggleHref} className="text-sm text-blue-600 hover:underline">
                    {t.listings.searchWorldwide}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
