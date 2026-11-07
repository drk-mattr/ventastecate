import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingCard } from '@/components/listings/listing-card'
import { FollowButton } from '@/components/user/follow-button'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { UserAvatar } from '@/components/ui/user-avatar'
import { BadgeCheck, Check, MapPin } from 'lucide-react'
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

  // Sold count, for the trust row. Facebook is NOT shown here:
  // identities are only knowable for the signed-in user, so the
  // public row uses photo, WhatsApp, sales and active listings.
  const { count: soldCount } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('status', 'sold')

  const memberSince = new Date(profile.created_at).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
  })

  // City, derived from the most recent active listing — profiles
  // has no location column, and this pass adds no migration.
  const city = listings?.[0]?.city || null
  const activeCount = listings?.length || 0
  const sold = soldCount ?? 0

  // Trust row — only true items. A zero is not a trust signal.
  const trustItems: string[] = []
  if (profile.avatar_url) trustItems.push('Foto de perfil')
  if (profile.whatsapp_number) trustItems.push('WhatsApp')
  if (sold > 0) trustItems.push(`${sold} ${sold === 1 ? 'venta concretada' : 'ventas concretadas'}`)
  if (activeCount > 0) trustItems.push(`${activeCount} ${activeCount === 1 ? 'anuncio activo' : 'anuncios activos'}`)

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="border-b pb-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <UserAvatar src={profile.avatar_url} name={profile.display_name} size="xl" />
            <div className="flex-1">
              <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">{profile.display_name}{profile.username === 'ventastecate' && (<span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-500"><BadgeCheck className="h-4 w-4 text-orange-600" />Cuenta oficial</span>)}</h1>
              <p className="text-sm text-gray-600 mb-2">@{profile.username}</p>
              {city && (
                <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {city}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-gray-700 mb-3">{profile.bio}</p>
              )}
              {/* Follower counts link to the list pages — they used
                  to be buttons with no onClick. */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                <Link href={`/users/${profile.username}/seguidores`} className="hover:underline">
                  <span className="font-semibold text-gray-900">{profile.followers_count || 0}</span> seguidores
                </Link>
                <Link href={`/users/${profile.username}/siguiendo`} className="hover:underline">
                  <span className="font-semibold text-gray-900">{profile.following_count || 0}</span> siguiendo
                </Link>
              </div>
              {/* Trust row — plain true facts only: no stars, no
                  reviews (no table exists), nothing invented. */}
              {trustItems.length > 0 && (
                <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 mb-2">
                  {trustItems.map((item) => (
                    <li key={item} className="flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 text-gray-900" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
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
            <EmptyState
              surface
              message={isOwnProfile ? 'No tienes anuncios activos' : 'Este usuario no tiene anuncios activos'}
              actionLabel={isOwnProfile ? 'Crear anuncio' : undefined}
              actionHref={isOwnProfile ? '/listings/new' : undefined}
            />
          )}
        </div>
      </main>
    </div>
  )
}
