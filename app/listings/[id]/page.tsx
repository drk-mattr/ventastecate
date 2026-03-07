import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ListingMetadata, RealEstateMetadata, AutomotiveMetadata, ListingType, ListingComment } from '@/lib/types/database'
import { ListingImageGallery } from '@/components/listings/listing-image-gallery'
import { CommentSection } from '@/components/listings/comment-section'
import Image from 'next/image'
import { MapPin, Calendar, Newspaper, Store, Bed, Droplets, Ruler, Home, Car, Gauge, Settings, Fuel, Palette, DoorOpen } from 'lucide-react'

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
  const isNews = listingType === 'news'

  // Fetch comments for news posts
  let comments: ListingComment[] = []
  if (isNews) {
    const { data: commentData } = await supabase
      .from('listing_comments')
      .select('*, profile:profiles(username, display_name, avatar_url)')
      .eq('listing_id', id)
      .order('created_at', { ascending: true })
    comments = (commentData as ListingComment[]) || []
  }

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

        {isNews ? (
          /* ── News / Announcement article layout ── */
          <article className="max-w-2xl mx-auto">

            {/* Category badge + breadcrumb */}
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="text-xs">{listing.category}</Badge>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Newspaper className="h-3 w-3" /> Noticia / Aviso
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-4">{listing.title}</h1>

            {/* Byline */}
            <div className="flex items-center gap-3 pb-4 border-b mb-6">
              <div className="relative h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold overflow-hidden shrink-0">
                {listing.store?.avatar_url ? (
                  <Image src={listing.store.avatar_url} alt={listing.store.name} fill className="object-cover" />
                ) : listing.profile.avatar_url ? (
                  <Image src={listing.profile.avatar_url} alt={listing.profile.display_name} fill className="object-cover" />
                ) : (
                  <span>{(listing.store?.name || listing.profile.display_name)[0].toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {listing.store ? (
                  <Link href={`/stores/${listing.store.slug}`} className="text-sm font-semibold hover:underline">{listing.store.name}</Link>
                ) : (
                  <Link href={`/users/${listing.profile.username}`} className="text-sm font-semibold hover:underline">{listing.profile.display_name}</Link>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(listing.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  {listing.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{listing.location}
                    </span>
                  )}
                </div>
              </div>
              {isOwner && (
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link href={`/listings/${listing.id}/edit`}>Editar</Link>
                </Button>
              )}
            </div>

            {/* Hero image */}
            {sortedImages.length > 0 && (
              <div className="mb-6 rounded-lg overflow-hidden">
                <ListingImageGallery
                  images={sortedImages}
                  listingTitle={listing.title}
                  isSold={listing.status === 'sold'}
                  listingType={listingType}
                />
              </div>
            )}

            {/* Article body */}
            <div className="prose prose-sm max-w-none">
              <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {/* Comment section */}
            <CommentSection
              listingId={listing.id}
              initialComments={comments}
              currentUserId={user?.id ?? null}
            />
          </article>
        ) : isEvent ? (
          /* ── Event layout: poster left, info right ── */
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start max-w-4xl mx-auto">
            {/* Left — fixed-width sticky poster */}
            <div className="lg:sticky lg:top-4">
              <ListingImageGallery
                images={sortedImages}
                listingTitle={listing.title}
                isSold={listing.status === 'sold'}
                listingType={listingType}
                variant="side"
              />
            </div>

            {/* Right — all event info */}
            <div className="space-y-4">
              {/* Title, price, meta */}
              <div>
                <h1 className="text-xl font-semibold mb-1">{listing.title}</h1>
                {listing.price > 0 && (
                  <p className="text-2xl font-bold text-gray-900 mb-3">{formattedPrice}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 pb-3 border-b">
                  <Badge variant="outline" className="text-xs">{listing.category}</Badge>
                  <span>·</span>
                  <span>{listing.location}</span>
                  <span>·</span>
                  <span>{new Date(listing.created_at).toLocaleDateString('es-MX')}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
              </div>

              {/* Organizer card */}
              <div className="border rounded-lg p-4 max-w-xs">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Organizador</p>

                {listing.store ? (
                  <div className="flex items-center gap-3 mb-4">
                    <Link href={`/stores/${listing.store.slug}`} className="relative h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                      {listing.store.avatar_url ? (
                        <Image src={listing.store.avatar_url} alt={listing.store.name} fill className="object-cover" />
                      ) : <Store className="h-5 w-5 text-gray-400" />}
                    </Link>
                    <div>
                      <Link href={`/stores/${listing.store.slug}`} className="text-sm font-semibold hover:underline">
                        {listing.store.name}
                      </Link>
                      <p className="text-xs text-gray-500">{listing.store.location || 'Tienda'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold overflow-hidden shrink-0">
                      {listing.profile.avatar_url ? (
                        <Image src={listing.profile.avatar_url} alt={listing.profile.display_name} fill className="object-cover" />
                      ) : listing.profile.display_name[0].toUpperCase()}
                    </div>
                    <div>
                      <Link href={`/users/${listing.profile.username}`} className="text-sm font-semibold hover:underline">
                        {listing.profile.display_name}
                      </Link>
                      <p className="text-xs text-gray-500">@{listing.profile.username}</p>
                    </div>
                  </div>
                )}

                {!isOwner && listing.status === 'active' && user && (
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/messages?listing=${listing.id}&seller=${listing.user_id}`}>Contactar Organizador</Link>
                  </Button>
                )}
                {!isOwner && listing.status === 'active' && !user && (
                  <Button asChild size="sm" className="w-full">
                    <Link href="/login">Iniciar sesión para contactar</Link>
                  </Button>
                )}
                {isOwner && (
                  <Button asChild size="sm" className="w-full" variant="outline">
                    <Link href={`/listings/${listing.id}/edit`}>Editar Anuncio</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Default layout: gallery above, 3-col grid below ── */
          <>
            <ListingImageGallery
              images={sortedImages}
              listingTitle={listing.title}
              isSold={listing.status === 'sold'}
              listingType={listingType}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Description */}
              <div className="lg:col-span-2 space-y-4">

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
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Bed className="h-3 w-3" /> Recámaras</div>
                          </div>
                        )}
                        {meta.bathrooms != null && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-lg font-semibold">{meta.bathrooms}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Droplets className="h-3 w-3" /> Baños</div>
                          </div>
                        )}
                        {meta.construction_m2 != null && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-lg font-semibold">{meta.construction_m2}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Ruler className="h-3 w-3" /> m² Const.</div>
                          </div>
                        )}
                        {meta.lot_m2 != null && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-lg font-semibold">{meta.lot_m2}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Home className="h-3 w-3" /> m² Terreno</div>
                          </div>
                        )}
                        {meta.parking_spots != null && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-lg font-semibold">{meta.parking_spots}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Car className="h-3 w-3" /> Estacion.</div>
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
                          <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Calendar className="h-3 w-3" /> Año</div>
                        </div>
                        {meta.mileage_km != null && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-lg font-semibold">{meta.mileage_km.toLocaleString()}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Gauge className="h-3 w-3" /> km</div>
                          </div>
                        )}
                        {meta.transmission && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-lg font-semibold">{transLabels[meta.transmission] || meta.transmission}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Settings className="h-3 w-3" /> Trans.</div>
                          </div>
                        )}
                        {meta.fuel_type && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-lg font-semibold">{fuelLabels[meta.fuel_type] || meta.fuel_type}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Fuel className="h-3 w-3" /> Comb.</div>
                          </div>
                        )}
                        {meta.color && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-lg font-semibold">{meta.color}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Palette className="h-3 w-3" /> Color</div>
                          </div>
                        )}
                        {meta.doors != null && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="text-lg font-semibold">{meta.doors}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><DoorOpen className="h-3 w-3" /> Puertas</div>
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
                    {isService ? 'Proveedor' : 'Vendedor'}
                  </h3>

                  {listing.store ? (
                    <div className="flex items-center gap-3 mb-6">
                      <Link href={`/stores/${listing.store.slug}`} className="relative h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                        {listing.store.avatar_url ? (
                          <Image src={listing.store.avatar_url} alt={listing.store.name} fill className="object-cover" />
                        ) : <Store className="h-6 w-6 text-gray-400" />}
                      </Link>
                      <div>
                        <Link href={`/stores/${listing.store.slug}`} className="font-semibold hover:underline">
                          {listing.store.name}
                        </Link>
                        <p className="text-xs text-gray-500">{listing.store.location || 'Tienda'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mb-6">
                      <div className="relative h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold overflow-hidden">
                        {listing.profile.avatar_url ? (
                          <Image src={listing.profile.avatar_url} alt={listing.profile.display_name} fill className="object-cover" />
                        ) : listing.profile.display_name[0].toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/users/${listing.profile.username}`} className="font-semibold hover:underline">
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
                        {isService ? 'Contactar' : 'Contactar Vendedor'}
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
          </>
        )}
      </main>
      </div>
    </>
  )
}
