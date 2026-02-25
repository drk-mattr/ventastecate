import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) {
    notFound()
  }

  // Get user's active listings
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
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // Check if current user is viewing their own profile
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === profile.id

  const memberSince = new Date(profile.created_at).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-3xl">
                  {profile.display_name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-1">{profile.display_name}</h1>
                <p className="text-gray-600 mb-2">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-gray-700 mb-3">{profile.bio}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Miembro desde {memberSince}</span>
                  <span>•</span>
                  <span>{listings?.length || 0} anuncios activos</span>
                </div>
              </div>
              {isOwnProfile && (
                <Button asChild>
                  <Link href="/profile/edit">Editar Perfil</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User's Listings */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Anuncios Activos</h2>
          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">
                {isOwnProfile
                  ? 'No tienes anuncios activos'
                  : 'Este usuario no tiene anuncios activos'}
              </p>
              {isOwnProfile && (
                <Button asChild className="mt-4">
                  <Link href="/listings/new">Crear tu primer anuncio</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
