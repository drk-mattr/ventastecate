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
      <main className="container mx-auto px-4 py-4 max-w-7xl">
        {/* Image Gallery */}
        {sortedImages.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 h-[400px] mb-6 rounded-lg overflow-hidden">
            {/* Main Image - Takes 2 columns and full height */}
            <div className="col-span-2 row-span-2 relative bg-gray-100">
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
            {/* Thumbnail grid - 2 columns, 2 rows */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {sortedImages.slice(1, 5).map((image: any, index: number) => (
              <div key={image.id} className="relative bg-gray-100">
                <Image
                  src={image.image_url}
                  alt={listing.title}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
            {/* Show more button if there are more than 5 images */}
            {sortedImages.length > 5 && (
              <div className="absolute bottom-4 right-4">
                <Button size="sm" variant="secondary" className="bg-white/90 hover:bg-white">
                  Ver todas las fotos ({sortedImages.length})
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center mb-6">
            <p className="text-sm text-gray-400">Sin imágenes</p>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Description */}
          <div className="lg:col-span-2 space-y-4">

            {/* Title and Price */}
            <div>
              <h1 className="text-2xl font-semibold mb-2">{listing.title}</h1>
              <p className="text-3xl font-bold text-gray-900 mb-4">{formattedPrice}</p>
              <div className="flex items-center gap-3 text-sm text-gray-600 pb-4 border-b">
                <Badge variant="outline" className="text-xs">{listing.category}</Badge>
                <span>•</span>
                <span>{listing.location}</span>
                <span>•</span>
                <span>{new Date(listing.created_at).toLocaleDateString('es-MX')}</span>
              </div>
            </div>

            {/* Description */}
            <div className="pt-4">
              <h2 className="text-base font-semibold mb-3">Descripción</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
            </div>
          </div>

          {/* Right Column - Seller Info */}
          <div>
            <div className="border rounded-lg p-6 sticky top-4">
              <h3 className="text-base font-semibold mb-4">Vendedor</h3>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold">
                  {listing.profile.display_name[0].toUpperCase()}
                </div>
                <div>
                  <Link 
                    href={`/users/${listing.profile.username}`}
                    className="font-semibold hover:underline"
                  >
                    {listing.profile.display_name}
                  </Link>
                  <p className="text-sm text-gray-500">@{listing.profile.username}</p>
                  <p className="text-xs text-gray-400">Desde {memberSince}</p>
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
                  <Link href="/login">Iniciar sesión para contactar</Link>
                </Button>
              )}

              {isOwner && (
                <div className="space-y-2">
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/listings/${listing.id}/edit`}>Editar Anuncio</Link>
                  </Button>
                  <p className="text-sm text-center text-gray-500 mt-4">Este es tu anuncio</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
