import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getTranslations } from '@/lib/i18n'

export default async function MyListingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/my-listings')
  }

  const headersList = await headers()
  const userCountry = headersList.get('cf-ipcountry') ?? null
  const t = getTranslations(userCountry)
  const f = t.forms

  // Fetch user's listings
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
      ),
      store:stores(
        id,
        slug,
        name
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const activeListings = listings?.filter(l => l.status === 'active') || []
  const soldListings = listings?.filter(l => l.status === 'sold') || []
  const inactiveListings = listings?.filter(l => l.status === 'inactive') || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{f.myListings}</h1>
          <Button asChild>
            <Link href="/listings/new">{f.createNewListingBtn}</Link>
          </Button>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">
              {f.activeTab} ({activeListings.length})
            </TabsTrigger>
            <TabsTrigger value="sold">
              {f.soldTab} ({soldListings.length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              {f.inactiveTab} ({inactiveListings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
            {activeListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">{f.noActiveListings}</p>
                <Button asChild>
                  <Link href="/listings/new">{f.createFirstListingBtn}</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sold" className="space-y-6">
            {soldListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {soldListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">{f.noSoldListings}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="inactive" className="space-y-6">
            {inactiveListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {inactiveListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">{f.noInactiveListings}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
