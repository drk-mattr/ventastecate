import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { SearchFilterBar } from '@/components/search/search-filter-bar'
import { ListingWithImages } from '@/lib/types/database'
import { getTranslations } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/empty-state'
import { LOCK_TO_TECATE, MVP_COUNTRY, resolveCountry } from '@/lib/mvp-config'
import Link from 'next/link'

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
    type?: string
    bedrooms?: string
    bathrooms?: string
    m2?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const supabase = await createClient()
  const { q, category, location, city, stateRegion, minPrice, maxPrice, sort, country, type, bedrooms, bathrooms, m2 } = await searchParams

  // Detect user country via Cloudflare header; resolveCountry() forces the MVP
  // market (MX) so border-town visitors on US IPs search Tecate listings.
  const headersList = await headers()
  const userCountry = resolveCountry(headersList.get('cf-ipcountry') ?? null)
  const t = getTranslations(userCountry)

  // 'all' = user opted into global search; absent = use detected country.
  // MVP: worldwide search is disabled and the market is pinned to Tecate (MX).
  const isGlobal = !LOCK_TO_TECATE && country === 'all'
  const effectiveCountry = LOCK_TO_TECATE
    ? MVP_COUNTRY
    : (isGlobal ? null : (country ?? userCountry))

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
        display_name,
        avatar_url
      ),
      store:stores(
        id,
        slug,
        name,
        avatar_url
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
  // location param searches across all three location columns
  if (location) {
    query = query.or(
      `location.ilike.%${location}%,city.ilike.%${location}%,state_region.ilike.%${location}%`
    )
  } else {
    // Legacy URL compat: separate city / stateRegion params still work
    if (city) query = query.ilike('city', `%${city}%`)
    if (stateRegion) query = query.ilike('state_region', `%${stateRegion}%`)
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
  if (type && type !== 'all') {
    query = query.eq('listing_type', type)
  }

  // Apply sorting
  if (sort === 'price_asc') {
    query = query.order('price', { ascending: true })
  } else if (sort === 'price_desc') {
    query = query.order('price', { ascending: false })
  } else if (sort === 'top') {
    // Algorithm ranking
    query = query.order('ranking_score', { ascending: false }).order('created_at', { ascending: false })
  } else {
    // Default: newest first
    query = query.order('created_at', { ascending: false })
  }

  const { data: listings } = await query.limit(50)

  // Category-specific (metadata) facets — filtered in-memory. Real estate:
  // recámaras / baños / m² minimums stored in the listing's jsonb metadata.
  const listingsWithImages: ListingWithImages[] = (listings || []).filter((l) => {
    const m = (l.metadata ?? {}) as Record<string, unknown>
    if (bedrooms && Number(m.bedrooms ?? 0) < Number(bedrooms)) return false
    if (bathrooms && Number(m.bathrooms ?? 0) < Number(bathrooms)) return false
    if (m2 && Number(m.construction_m2 ?? 0) < Number(m2)) return false
    return true
  })

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
        {/* Compact header */}
        <div className="mb-3">
          <h1 className="text-lg font-semibold leading-tight">
            {q ? `"${q}"` : t.hero.search}
          </h1>
          <p className="text-xs text-gray-500">
            {resultCount} {resultLabel}
            {(location || city || stateRegion) && ` ${t.listings.in} ${location || city || stateRegion}`}
          </p>
        </div>

        {/* Sticky horizontal filter bar */}
        <div className="sticky top-14 z-30 bg-white -mx-4 px-4 py-2 mb-4 border-b border-gray-100">
          <SearchFilterBar
            query={q}
            category={category}
            location={location}
            minPrice={minPrice}
            maxPrice={maxPrice}
            sort={sort}
            country={country}
            bedrooms={bedrooms}
            bathrooms={bathrooms}
            m2={m2}
          />
        </div>

        {/* Full-width results grid */}
        {listingsWithImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {listingsWithImages.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <EmptyState message={t.listings.noResults}>
            {!LOCK_TO_TECATE && effectiveCountry && !isGlobal && (
              <Link href={toggleHref} className="text-sm text-blue-600 hover:underline">
                {t.listings.searchWorldwide}
              </Link>
            )}
          </EmptyState>
        )}
      </main>
    </div>
  )
}
