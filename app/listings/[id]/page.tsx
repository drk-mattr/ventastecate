import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
    .eq('id', id)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedImages = listing.images.sort((a: any, b: any) => a.order_index - b.order_index)
  const memberSince = new Date(listing.profile.created_at).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Images */}
          <div className="lg:col-span-2 space-y-3">
            {sortedImages.length > 0 ? (
              <>
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={sortedImages[0].image_url}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    priority
                  />
                  {listing.status === 'sold' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="secondary" className="text-sm">
                        Vendido
                      </Badge>
                    </div>
                  )}
                </div>
                {sortedImages.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {sortedImages.slice(1).map((image: any) => (
                      <div key={image.id} className="relative aspect-square bg-gray-100 rounded overflow-hidden">
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
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-sm text-gray-400">Sin imágenes</p>
              </div>
            )}

            {/* Description */}
            <div className="border-t pt-4">
              <h2 className="text-sm font-semibold mb-2 text-gray-700">Descripción</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="space-y-3">
                <div>
                  <h1 className="text-xl font-semibold mb-2">{listing.title}</h1>
                  <p className="text-2xl font-bold text-gray-900">{formattedPrice}</p>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Categoría:</span>
                    <Badge variant="outline" className="text-xs">{listing.category}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Ubicación:</span>
                    <span>{listing.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Publicado:</span>
                    <span>{new Date(listing.created_at).toLocaleDateString('es-MX')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 text-gray-700">Vendedor</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold">
                  {listing.profile.display_name[0].toUpperCase()}
                </div>
                <div>
                  <Link 
                    href={`/users/${listing.profile.username}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {listing.profile.display_name}
                  </Link>
                  <p className="text-xs text-gray-500">@{listing.profile.username}</p>
                  <p className="text-xs text-gray-400">Desde {memberSince}</p>
                </div>
              </div>
              
              {!isOwner && listing.status === 'active' && user && (
                <Button asChild className="w-full h-9 text-sm">
                  <Link href={`/messages?listing=${listing.id}&seller=${listing.user_id}`}>
                    Contactar Vendedor
                  </Link>
                </Button>
              )}

              {!isOwner && listing.status === 'active' && !user && (
                <Button asChild className="w-full h-9 text-sm">
                  <Link href="/login">Iniciar sesión para contactar</Link>
                </Button>
              )}

              {isOwner && (
                <div className="space-y-2">
                  <Button asChild className="w-full h-9 text-sm" variant="outline">
                    <Link href={`/listings/${listing.id}/edit`}>Editar Anuncio</Link>
                  </Button>
                  <p className="text-xs text-center text-gray-500">Este es tu anuncio</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
