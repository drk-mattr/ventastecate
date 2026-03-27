import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
import Image from 'next/image'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { FollowButton } from '@/components/user/follow-button'
import { Button } from '@/components/ui/button'


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
      ),
      store:stores(
        id,
        slug,
        name
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
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="border-b pb-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-semibold overflow-hidden">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  fill
                  className="object-cover"
                />
              ) : (
                profile.display_name[0].toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-1">{profile.display_name}</h1>
              <p className="text-sm text-gray-600 mb-2">@{profile.username}</p>
              {profile.bio && (
                <p className="text-sm text-gray-700 mb-3">{profile.bio}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                <button className="hover:underline">
                  <span className="font-semibold text-gray-900">{profile.followers_count || 0}</span> seguidores
                </button>
                <button className="hover:underline">
                  <span className="font-semibold text-gray-900">{profile.following_count || 0}</span> siguiendo
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{listings?.length || 0} anuncios</span>
                <span>•</span>
                <span>Desde {memberSince}</span>
              </div>
            </div>
            {isOwnProfile ? (
              <Button asChild size="sm">
                <Link href="/profile/edit">Editar Perfil</Link>
              </Button>
            ) : (
              <FollowButton profileId={profile.id} />
            )}
          </div>
        </div>

        {/* User's Listings */}
        <div>
          <h2 className="text-base font-medium mb-4 text-gray-700">Anuncios</h2>
          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">
                {isOwnProfile
                  ? 'No tienes anuncios activos'
                  : 'Este usuario no tiene anuncios activos'}
              </p>
              {isOwnProfile && (
                <Button asChild size="sm" className="mt-4">
                  <Link href="/listings/new">Crear anuncio</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
