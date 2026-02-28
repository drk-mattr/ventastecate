import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ListingMetadata, RealEstateMetadata, AutomotiveMetadata, ListingType } from '@/lib/types/database'
import { ListingImageGallery } from '@/components/listings/listing-image-gallery'
import Image from 'next/image'

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: listing } = await supabase
    .from('listings')
    .select(`
      *,
      images:listing_images(
        image_url,
        order_index
      ),
      profile:profiles(
        display_name,
        username
      )
    `)
    .eq('id', id)
    .single()

  if (!listing) {
    return {
      title: 'Anuncio no encontrado | Ventas Tecate',
    }
  }

  const formattedPrice = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(listing.price)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedImages = listing.images?.sort((a: any, b: any) => a.order_index - b.order_index) || []
  const primaryImage = sortedImages[0]?.image_url

  const description = `${listing.title} - ${formattedPrice}. ${listing.description.substring(0, 155)}...`
  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ventastecate.com'}/listings/${id}`

  return {
    title: `${listing.title} - ${formattedPrice} | Ventas Tecate`,
    description,
    keywords: [
      listing.title,
      listing.category,
      listing.location,
      'Ventas Tecate',
      'compra venta',
      'marketplace',
      'segunda mano',
    ],
    authors: [{ name: listing.profile.display_name }],
    openGraph: {
      title: listing.title,
      description,
      url,
      siteName: 'Ventas Tecate',
      images: primaryImage ? [
        {
          url: primaryImage,
          width: 1200,
          height: 630,
          alt: listing.title,
        },
      ] : [],
      locale: 'es_MX',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: listing.title,
      description,
      images: primaryImage ? [primaryImage] : [],
    },
    alternates: {
      canonical: url,
    },
  }
}

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
        avatar_url,
        created_at
      ),
      store:stores(
        id,
        slug,
        name,
        avatar_url,
        location
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

  const listingType: ListingType = listing.listing_type || 'product'
  const isService = listingType === 'service'
  const isEvent = listingType === 'event'

  const formattedPrice = listing.price > 0
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(listing.price)
    : 'Consultar precio'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedImages = listing.images.sort((a: any, b: any) => a.order_index - b.order_index)
  const memberSince = new Date(listing.profile.created_at).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
  })

  // Structured data for SEO (JSON-LD)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': isService ? 'Service' : 'Product',
    name: listing.title,
    description: listing.description,
    image: sortedImages.map((img: { image_url: string }) => img.image_url),
    ...(isService ? {
      provider: {
        '@type': listing.store ? 'Organization' : 'Person',
        name: listing.store ? listing.store.name : listing.profile.display_name,
      },
      areaServed: listing.location,
    } : {
      offers: {
        '@type': 'Offer',
        price: listing.price,
        priceCurrency: 'MXN',
        availability: listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Person',
          name: listing.profile.display_name,
        },
      },
    }),
    category: listing.category,
    brand: {
      '@type': 'Brand',
      name: 'Ventas Tecate',
    },
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-white">
        <Header />
      <main className="container mx-auto px-4 py-4 max-w-7xl">
        {/* Image Gallery */}
        <ListingImageGallery 
          images={sortedImages}
          listingTitle={listing.title}
          isSold={listing.status === 'sold'}
          listingType={listingType}
        />

        {/* Content Grid — events use a centered single-column poster layout */}
        <div className={isEvent ? 'max-w-2xl mx-auto space-y-4' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
          {/* Left Column - Description */}
          <div className={isEvent ? 'space-y-4' : 'lg:col-span-2 space-y-4'}>

            {/* Title and Price */}
            <div>
              <h1 className="text-2xl font-semibold mb-2">{listing.title}</h1>
              {listing.price > 0 && (
                <p className="text-3xl font-bold text-gray-900 mb-4">{formattedPrice}</p>
              )}
              <div className="flex items-center gap-3 text-sm text-gray-600 pb-4 border-b">
                <Badge variant="outline" className="text-xs">{listing.category}</Badge>
                <span>•</span>
                <span>{listing.location}</span>
                <span>•</span>
                <span>{new Date(listing.created_at).toLocaleDateString('es-MX')}</span>
              </div>
            </div>

            {/* Specs Grid for specialized listings */}
            {listing.metadata && (listing.metadata as ListingMetadata).type === 'real_estate' && (() => {
              const meta = listing.metadata as RealEstateMetadata
              const propertyLabels: Record<string, string> = { casa: 'Casa', departamento: 'Depto', terreno: 'Terreno', local: 'Local', oficina: 'Oficina' }
              return (
                <div className="pt-4 border-t">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge variant="secondary" className="text-xs">
                      {meta.transaction_type === 'renta' ? 'En Renta' : 'En Venta'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {propertyLabels[meta.property_type] || meta.property_type}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {meta.bedrooms != null && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-semibold">{meta.bedrooms}</p>
                        <p className="text-xs text-gray-500">🛏 Recámaras</p>
                      </div>
                    )}
                    {meta.bathrooms != null && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-semibold">{meta.bathrooms}</p>
                        <p className="text-xs text-gray-500">🚿 Baños</p>
                      </div>
                    )}
                    {meta.construction_m2 != null && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-semibold">{meta.construction_m2}</p>
                        <p className="text-xs text-gray-500">📐 m² Const.</p>
                      </div>
                    )}
                    {meta.lot_m2 != null && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-semibold">{meta.lot_m2}</p>
                        <p className="text-xs text-gray-500">🏡 m² Terreno</p>
                      </div>
                    )}
                    {meta.parking_spots != null && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-semibold">{meta.parking_spots}</p>
                        <p className="text-xs text-gray-500">🚗 Estacion.</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {listing.metadata && (listing.metadata as ListingMetadata).type === 'automotive' && (() => {
              const meta = listing.metadata as AutomotiveMetadata
              const fuelLabels: Record<string, string> = { gasolina: 'Gasolina', diesel: 'Diésel', electrico: 'Eléctrico', hibrido: 'Híbrido' }
              const transLabels: Record<string, string> = { automatica: 'Automática', manual: 'Manual' }
              return (
                <div className="pt-4 border-t">
                  <p className="text-base font-medium text-gray-700 mb-4">
                    {meta.make} {meta.model} {meta.year}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-lg font-semibold">{meta.year}</p>
                      <p className="text-xs text-gray-500">📅 Año</p>
                    </div>
                    {meta.mileage_km != null && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-semibold">{meta.mileage_km.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">🛣 km</p>
                      </div>
                    )}
                    {meta.transmission && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-semibold">{transLabels[meta.transmission] || meta.transmission}</p>
                        <p className="text-xs text-gray-500">⚙️ Trans.</p>
                      </div>
                    )}
                    {meta.fuel_type && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-semibold">{fuelLabels[meta.fuel_type] || meta.fuel_type}</p>
                        <p className="text-xs text-gray-500">⛽ Comb.</p>
                      </div>
                    )}
                    {meta.color && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-semibold">{meta.color}</p>
                        <p className="text-xs text-gray-500">🎨 Color</p>
                      </div>
                    )}
                    {meta.doors != null && (
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-semibold">{meta.doors}</p>
                        <p className="text-xs text-gray-500">🚪 Puertas</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Description */}
            <div className="pt-4">
              <h2 className="text-base font-semibold mb-3">Descripción</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
            </div>
          </div>

          {/* Right Column - Seller Info */}
          <div>
            <div className="border rounded-lg p-6 sticky top-4">
              <h3 className="text-base font-semibold mb-4">
                {isService ? 'Proveedor' : isEvent ? 'Organizador' : 'Vendedor'}
              </h3>

              {listing.store ? (
                /* Store seller card */
                <div className="flex items-center gap-3 mb-6">
                  <Link href={`/stores/${listing.store.slug}`} className="relative h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center text-xl overflow-hidden shrink-0">
                    {listing.store.avatar_url ? (
                      <Image
                        src={listing.store.avatar_url}
                        alt={listing.store.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      '🏪'
                    )}
                  </Link>
                  <div>
                    <Link
                      href={`/stores/${listing.store.slug}`}
                      className="font-semibold hover:underline"
                    >
                      {listing.store.name}
                    </Link>
                    <p className="text-xs text-gray-500">{listing.store.location || 'Tienda'}</p>
                  </div>
                </div>
              ) : (
                /* Personal seller card */
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold overflow-hidden">
                    {listing.profile.avatar_url ? (
                      <Image
                        src={listing.profile.avatar_url}
                        alt={listing.profile.display_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      listing.profile.display_name[0].toUpperCase()
                    )}
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
              )}
              
              {!isOwner && listing.status === 'active' && user && (
                <Button asChild className="w-full">
                  <Link href={`/messages?listing=${listing.id}&seller=${listing.user_id}`}>
                    {isService ? 'Contactar' : isEvent ? 'Contactar Organizador' : 'Contactar Vendedor'}
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
    </>
  )
}
