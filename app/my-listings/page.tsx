import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { MyListingCard } from '@/components/listings/my-listing-card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getTranslations } from '@/lib/i18n'
import { Bookmark } from 'lucide-react'
import type { ListingWithImages } from '@/lib/types/database'

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
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch saved listings
  const { data: savedData } = await supabase
    .from('listing_saves')
    .select(`
      listing_id,
      listing:listings(
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
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const savedListings: ListingWithImages[] = (savedData || [])
    .map(s => s.listing)
    .filter(Boolean)
    .map(l => ({ ...l, user_has_saved: true })) as unknown as ListingWithImages[]

  const activeListings = listings?.filter(l => l.status === 'active') || []
  const soldListings = listings?.filter(l => l.status === 'sold') || []
  const inactiveListings = listings?.filter(l => l.status === 'inactive') || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">{f.myListings}</h1>
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
            <TabsTrigger value="saved" className="flex items-center gap-1">
              <Bookmark className="h-3.5 w-3.5" />
              Guardados ({savedListings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
            {activeListings.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {activeListings.map((listing) => (
                  <MyListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-white px-6 py-10 text-center">
                <p className="text-gray-500 mb-4">{f.noActiveListings}</p>
                <Button asChild>
                  <Link href="/listings/new">{f.createFirstListingBtn}</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sold" className="space-y-6">
            {soldListings.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {soldListings.map((listing) => (
                  <MyListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-white px-6 py-10 text-center">
                <p className="text-gray-500">{f.noSoldListings}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="inactive" className="space-y-6">
            {inactiveListings.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {inactiveListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-white px-6 py-10 text-center">
                <p className="text-gray-500">{f.noInactiveListings}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            {savedListings.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {savedListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-white px-6 py-10 text-center">
                <Bookmark className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-1">No tienes publicaciones guardadas</p>
                <p className="text-xs text-gray-400">
                  Toca el icono de guardado en cualquier publicacion para verla aqui
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
