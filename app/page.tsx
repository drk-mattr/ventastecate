import Link from 'next/link'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ListingCard } from '@/components/listings/listing-card'
import { DynamicHero } from '@/components/home/dynamic-hero'
import { ListingWithImages } from '@/lib/types/database'
import { Button } from '@/components/ui/button'
import { getTranslations } from '@/lib/i18n'

interface HomeProps {
  searchParams: Promise<{ global?: string }>
}

export default async function Home({ searchParams }: HomeProps) {
  const supabase = await createClient()
  const { global: globalParam } = await searchParams
  const isGlobal = globalParam === '1'

  // Detect user country via Cloudflare header (null in local dev)
  const headersList = await headers()
  const userCountry = headersList.get('cf-ipcountry') ?? null
  const t = getTranslations(userCountry)

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

  // Filter by country unless user opted into global view
  if (userCountry && !isGlobal) {
    query = query.eq('country_code', userCountry)
  }

  const { data: listings } = await query
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-gray-700">
              {isGlobal ? t.listings.worldwide : t.listings.recent}
            </h2>
            {userCountry && (
              <Link
                href={isGlobal ? '/' : '/?global=1'}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {isGlobal ? `📍 ${t.listings.onlyIn} ${userCountry}` : t.listings.seeAll}
              </Link>
            )}
          </div>

          {listingsWithImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {listingsWithImages.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 mb-4">
                {userCountry && !isGlobal
                  ? t.listings.noListingsInRegion
                  : t.listings.noListings}
              </p>
              {userCountry && !isGlobal && (
                <Link href="/?global=1" className="text-sm text-blue-600 hover:underline block mb-4">
                  {t.listings.seeWorldwide}
                </Link>
              )}
              <Button asChild size="sm">
                <Link href="/listings/new">{t.listings.postListing}</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
