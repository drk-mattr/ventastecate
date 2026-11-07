import { headers, cookies } from 'next/headers'
import { LOCATION_COOKIE, townsForLocation, townFilterOr } from '@/lib/business-regions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { searchKinds, type KindSearchHit } from '@/lib/items/kind-search'
import { Header } from '@/components/layout/header'
import { CommunityFeed } from '@/components/home/community-feed'
import { SearchFilterBar } from '@/components/search/search-filter-bar'
import { ListingWithImages } from '@/lib/types/database'
import { getTranslations } from '@/lib/i18n'
import { EmptyState } from '@/components/ui/empty-state'
import { LOCK_TO_TECATE, resolveCountry } from '@/lib/mvp-config'
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
    currency?: string
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
  const { q, category, location, city, stateRegion, minPrice, maxPrice, currency, sort, country, type, bedrooms, bathrooms, m2 } = await searchParams

  // Language only: resolveCountry() forces es-MX. Search no longer forces an
  // MX filter (soft region) — a user-chosen country param still filters.
  const headersList = await headers()
  const userCountry = resolveCountry(headersList.get('cf-ipcountry') ?? null)
  const t = getTranslations(userCountry)

  // Soft region: no forced country filter. Only filter when the user
  // explicitly picks a country (and 'all' means no filter).
  const isGlobal = country === 'all' || !country
  const effectiveCountry = country && country !== 'all' ? country : null

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
  // A search term matches a listing's title, description, OR category —
  // and, below, businesses whose name or category matches it (accent-
  // insensitive: "cafe" must find "café"). Searching "cafe" used to miss
  // coffee shops whose name never contains the word.
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
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
  // Site-wide location: the header selector's cookie, default Tecate.
  // An explicitly typed location/city/country search wins over it.
  if (!location && !city && !stateRegion && !country) {
    const cookieStore = await cookies()
    const searchTowns = townsForLocation(cookieStore.get(LOCATION_COOKIE)?.value)
    if (searchTowns) {
      // Case-insensitive (ilike): a listing whose city was saved
      // free-typed as "tecate" still matches the "Tecate" town.
      query = query.or(townFilterOr(searchTowns))
    }
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

  // Currency filter (migration 038): MXN / USD / all. No conversion —
  // the filter only narrows rows, so the price sort stays honest.
  // Applied in JS, not SQL, like the metadata facets below: pre-038
  // the currency column doesn't exist, and rows without it are MXN
  // by definition (every listing entered so far was priced in pesos).
  const hasCurrencyFilter = currency === 'MXN' || currency === 'USD'
  const hasMetadataFilter = Boolean(bedrooms || bathrooms || m2)
  const DISPLAY_LIMIT = 50
  const { data: listings } = await query.limit(hasMetadataFilter || hasCurrencyFilter ? 500 : DISPLAY_LIMIT)

  const listingsWithImages: ListingWithImages[] = (listings || [])
    .filter((l) => {
      const m = (l.metadata ?? {}) as Record<string, unknown>
      if (hasCurrencyFilter && ((l.currency ?? 'MXN') !== currency)) return false
      if (bedrooms && Number(m.bedrooms ?? 0) < Number(bedrooms)) return false
      if (bathrooms && Number(m.bathrooms ?? 0) < Number(bathrooms)) return false
      if (m2 && Number(m.construction_m2 ?? 0) < Number(m2)) return false
      return true
    })
    .slice(0, DISPLAY_LIMIT)

  // Build toggle URL (preserve other params, flip country)
  const toggleParams = new URLSearchParams()
  if (q) toggleParams.set('q', q)
  if (category) toggleParams.set('category', category)
  if (location) toggleParams.set('location', location)
  if (city) toggleParams.set('city', city)
  if (stateRegion) toggleParams.set('stateRegion', stateRegion)
  if (minPrice) toggleParams.set('minPrice', minPrice)
  if (maxPrice) toggleParams.set('maxPrice', maxPrice)
  if (currency) toggleParams.set('currency', currency)
  if (sort) toggleParams.set('sort', sort)
  if (!isGlobal) toggleParams.set('country', 'all')
  const toggleHref = `/search?${toggleParams.toString()}`

  // Businesses matching the same term: by name, or by a category whose
  // accent-stripped form contains the term ("cafe" -> "café"). Limited to
  // the selected location unless the user typed an explicit location.
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  let matchingBusinesses: { id: string; name: string; category: string | null; city: string | null; location: string | null }[] = []
  if (q) {
    const { data: bizCatRows } = await supabase.from('businesses').select('category').limit(2000)
    const matchingCategories = [...new Set((bizCatRows || []).map((r) => r.category).filter(Boolean) as string[])]
      .filter((c) => normalize(c).includes(normalize(q)))
    let bizQuery = supabase.from('businesses').select('id, name, category, city, location')
    const orParts = [`name_normalized.ilike.%${q.toLowerCase()}%`]
    if (matchingCategories.length > 0) orParts.push(`category.in.(${matchingCategories.join(',')})`)
    bizQuery = bizQuery.or(orParts.join(','))
    if (!location && !city && !stateRegion && !country) {
      const bizCookieStore = await cookies()
      const bizTowns = townsForLocation(bizCookieStore.get(LOCATION_COOKIE)?.value)
      if (bizTowns) bizQuery = bizQuery.in('city', bizTowns)
    }
    const { data: bizRows } = await bizQuery.order('name_normalized', { ascending: true }).limit(12)
    matchingBusinesses = bizRows || []
  }

  // Kinds matching the term (§5 pipeline: exact canonical/alias, then
  // normalized suggestions). A kind is the thing itself — the section
  // links to its /tipos page. Counts respect the same location scope
  // as the businesses above (cookie towns, unless the user typed an
  // explicit location).
  let matchingKinds: KindSearchHit[] = []
  if (q) {
    const kindsAdmin = createAdminClient()
    if (kindsAdmin) {
      const kindsTowns =
        !location && !city && !stateRegion && !country
          ? townsForLocation((await cookies()).get(LOCATION_COOKIE)?.value)
          : null
      matchingKinds = await searchKinds(kindsAdmin, q, { towns: kindsTowns, limit: 8 })
    }
  }

  const resultCount = listingsWithImages.length
  const resultLabel = resultCount === 1 ? t.listings.result : t.listings.results

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6">
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
        <div className="sticky top-24 sm:top-14 z-30 bg-white -mx-4 px-4 py-2 mb-4 border-b border-gray-100">
          <SearchFilterBar
            query={q}
            category={category}
            location={location}
            minPrice={minPrice}
            maxPrice={maxPrice}
            currency={currency}
            sort={sort}
            country={country}
            bedrooms={bedrooms}
            bathrooms={bathrooms}
            m2={m2}
          />
        </div>

        {/* Kinds matching the term, so "tacos" finds the type itself —
            with its parent breadcrumb — and leads to its /tipos page. */}
        {matchingKinds.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-semibold mb-2">Tipos</h2>
            <ul className="divide-y divide-gray-200 border-y border-gray-200">
              {matchingKinds.map((k) => (
                <li key={k.id} className="py-2 flex items-baseline justify-between gap-4">
                  <Link href={`/tipos/${k.slug}`} className="text-sm font-semibold text-gray-900 hover:underline truncate">
                    {k.parent_name ? `${k.parent_name} › ${k.name}` : k.name}
                  </Link>
                  <span className="text-xs text-gray-500 shrink-0">
                    {k.offering_count > 0
                      ? `${k.offering_count} ${k.offering_count === 1 ? 'negocio lo ofrece' : 'negocios lo ofrecen'}`
                      : 'Sin ofertas todavía'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Businesses matching the term, so a category search finds
            the actual shops, not just listings with the word in the name. */}
        {matchingBusinesses.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-semibold mb-2">Negocios</h2>
            <ul className="divide-y divide-gray-200 border-y border-gray-200">
              {matchingBusinesses.map((b) => (
                <li key={b.id} className="py-2 flex items-baseline justify-between gap-4">
                  <Link href={`/businesses/${b.id}`} className="text-sm font-semibold text-gray-900 hover:underline truncate">{b.name}</Link>
                  <span className="text-xs text-gray-500 shrink-0">{[b.category, b.city || b.location].filter(Boolean).join(' · ')}</span>
                </li>
              ))}
            </ul>
            <Link href={`/businesses?q=${encodeURIComponent(q || '')}`} className="text-xs text-gray-900 underline mt-2 inline-block">Ver todos los negocios →</Link>
          </section>
        )}

        {/* Full-width results grid */}
        {listingsWithImages.length > 0 ? (
          <CommunityFeed
            initialListings={listingsWithImages}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
          />
        ) : (
          <EmptyState message={t.listings.noResults}>
            {!LOCK_TO_TECATE && effectiveCountry && !isGlobal && (
              <Link href={toggleHref} className="text-sm text-gray-900 hover:underline">
                {t.listings.searchWorldwide}
              </Link>
            )}
          </EmptyState>
        )}
      </main>
    </div>
  )
}
