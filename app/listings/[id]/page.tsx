import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  const { data: listing } = await supabase
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
        created_at
      )
    `)
    .eq('id', params.id)
    .single()

  if (!listing) {
    notFound()
  }

  // Get current user to check if they own this listing
  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === listing.user_id

  const formattedPrice = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(listing.price)

  const sortedImages = listing.images.sort((a: any, b: any) => a.order_index - b.order_index)
  const memberSince = new Date(listing.profile.created_at).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images */}
          <div className="lg:col-span-2 space-y-4">
            {sortedImages.length > 0 ? (
              <>
                <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={sortedImages[0].image_url}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    priority
                  />
                  {listing.status === 'sold' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Badge variant="secondary" className="text-2xl py-2 px-4">
                        Vendido
                      </Badge>
                    </div>
                  )}
                </div>
                {sortedImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {sortedImages.slice(1).map((image: any) => (
                      <div key={image.id} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={image.image_url}
                          alt={listing.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-[4/3] bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">Sin imágenes</p>
              </div>
            )}

            {/* Description Card */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Descripción</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">{listing.title}</h1>
                    <p className="text-4xl font-bold text-blue-600">{formattedPrice}</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Categoría:</span>
                      <Badge variant="outline">{listing.category}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Ubicación:</span>
                      <span className="font-medium">{listing.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Publicado:</span>
                      <span>{new Date(listing.created_at).toLocaleDateString('es-MX')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold mb-4">Vendedor</h3>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {listing.profile.display_name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link 
                      href={`/users/${listing.profile.username}`}
                      className="font-semibold hover:underline"
                    >
                      {listing.profile.display_name}
                    </Link>
                    <p className="text-sm text-gray-500">@{listing.profile.username}</p>
                    <p className="text-xs text-gray-400">Miembro desde {memberSince}</p>
                  </div>
                </div>
                
                {!isOwner && listing.status === 'active' && user && (
                  <Button asChild className="w-full">
                    <Link href={`/messages?listing=${listing.id}&seller=${listing.user_id}`}>
                      Contactar Vendedor
                    </Link>
                  </Button>
                )}

                {!isOwner && listing.status === 'active' && !user && (
                  <Button asChild className="w-full">
                    <Link href="/login">Inicia sesión para contactar</Link>
                  </Button>
                )}

                {isOwner && (
                  <div className="space-y-2">
                    <Button asChild className="w-full" variant="outline">
                      <Link href={`/listings/${listing.id}/edit`}>Editar Anuncio</Link>
                    </Button>
                    <Button className="w-full" variant="secondary" disabled>
                      Este es tu anuncio
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
