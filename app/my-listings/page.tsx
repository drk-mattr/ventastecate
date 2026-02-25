import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function MyListingsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login?redirect=/my-listings')
  }

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
          <h1 className="text-3xl font-bold">Mis Anuncios</h1>
          <Button asChild>
            <Link href="/listings/new">Crear Nuevo Anuncio</Link>
          </Button>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">
              Activos ({activeListings.length})
            </TabsTrigger>
            <TabsTrigger value="sold">
              Vendidos ({soldListings.length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactivos ({inactiveListings.length})
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
                <p className="text-gray-500 mb-4">No tienes anuncios activos</p>
                <Button asChild>
                  <Link href="/listings/new">Crear tu primer anuncio</Link>
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
                <p className="text-gray-500">No tienes anuncios vendidos</p>
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
                <p className="text-gray-500">No tienes anuncios inactivos</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
