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
import { ReportListingButton } from '@/components/listings/report-listing-button'
import Image from 'next/image'
import { MapPin, Calendar, Newspaper, Store, Bed, Droplets, Ruler, Home, Car, Gauge, Settings, Fuel, Palette, DoorOpen, BadgeCheck } from 'lucide-react'
import { ListingEngagementBar } from '@/components/listings/listing-engagement-bar'
import { VideoEmbed } from '@/components/listings/video-embed'

// Serialize JSON-LD safely: escape characters that could break out of the
// <script> tag (prevents stored XSS via user-controlled title/description).
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

// Marketplace-style "posted" label: relative for recent items, full date later.
function formatPostedDate(iso: string): string {
  const date = new Date(iso)
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (diffDays <= 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) {
    const w = Math.floor(diffDays / 7)
    return `Hace ${w} ${w === 1 ? 'semana' : 'semanas'}`
  }
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

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

  // WhatsApp number lives on the seller's profile. Fetched separately so
  // that, before migration 019 is applied, a missing column only hides
  // the WhatsApp button instead of breaking this whole page.
  let sellerWhatsapp: string | null = null
  {
    const { data: waData } = await supabase
      .from('profiles')
      .select('whatsapp_number')
      .eq('id', listing.user_id)
      .single()
    sellerWhatsapp = (waData as { whatsapp_number?: string | null } | null)?.whatsapp_number ?? null
  }

  const listingType: ListingType = listing.listing_type || 'product'
  const isService = listingType === 'service'
  const isEvent = listingType === 'event'
  const isNews = listingType === 'news'

  // Fetch comments for ALL listing types
  const { data: commentData } = await supabase
    .from('listing_comments')
    .select('*, profile:profiles(username, display_name, avatar_url)')
    .eq('listing_id', id)
    .order('created_at', { ascending: true })
  const comments: ListingComment[] = (commentData as ListingComment[]) || []

  // Fetch tagged business if present
  let taggedBusiness = null
  if (listing.tagged_business_id) {
    const { data: bizData } = await supabase
      .from('businesses')
      .select('*, store:stores(id, slug, name, avatar_url)')
      .eq('id', listing.tagged_business_id)
      .single()
    taggedBusiness = bizData
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

  // Tagged business card (reused across layouts)
  const taggedBusinessCard = taggedBusiness ? (
    <div className="flex items-center gap-2.5 bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5">
      <Store className="h-4 w-4 text-gray-900 shrink-0" />
      <div className="flex-1 min-w-0">
        <Link href={`/businesses/${taggedBusiness.id}`} className="text-sm font-medium text-gray-900 hover:underline truncate block">
          {taggedBusiness.name}
        </Link>
        {taggedBusiness.store && (
          <Link href={`/stores/${taggedBusiness.store.slug}`} className="text-xs text-gray-500 hover:underline block">
            Tienda oficial
          </Link>
        )}
        {(taggedBusiness.category || taggedBusiness.location) && (
          <p className="text-[10px] text-orange-400 truncate">
            {[taggedBusiness.category, taggedBusiness.location].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      {taggedBusiness.mention_count > 0 && (
        <span className="text-[10px] text-orange-400 bg-orange-100 px-1.5 py-0.5 rounded-full shrink-0">
          {taggedBusiness.mention_count} {taggedBusiness.mention_count === 1 ? 'mención' : 'menciones'}
        </span>
      )}
    </div>
  ) : null

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />
      <div className="min-h-screen bg-white">
        <Header />
      <main className="container mx-auto px-4 py-6 max-w-7xl">

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
            <h1 className="text-2xl font-semibold leading-tight mb-4">{listing.title}</h1>

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
                  <span className="flex items-center gap-2">
                    <Link href={`/users/${listing.profile.username}`} className="text-sm font-semibold hover:underline">{listing.profile.display_name}</Link>
                    {listing.profile.username === 'ventastecate' && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-gray-500"><BadgeCheck className="h-3.5 w-3.5 text-orange-600" />Cuenta oficial</span>
                    )}
                  </span>
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
              <div className="mb-6 rounded-xl overflow-hidden">
                <ListingImageGallery
                  images={sortedImages}
                  listingTitle={listing.title}
                  isSold={listing.status === 'sold'}
                  listingType={listingType}
                />
              </div>
            )}

            {/* Video embed */}
            {listing.video_url && (
              <div className="mb-6">
                <VideoEmbed url={listing.video_url} title={listing.title} />
              </div>
            )}

            {/* Article body */}
            <div className="prose prose-sm max-w-none">
              <p className="text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {/* Tagged business */}
            {taggedBusinessCard}

            {/* Engagement bar */}
            <ListingEngagementBar
              listingId={listing.id}
              likesCount={listing.likes_count ?? 0}
              savesCount={listing.saves_count ?? 0}
            />

            {/* Comment section */}
            <CommentSection
              listingId={listing.id}
              initialComments={comments}
              currentUserId={user?.id ?? null}
            />
          </article>
        ) : isEvent ? (
          /* ── Event layout: poster left, info right ── */
          <>
          <div className="grid grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] gap-6 lg:gap-10 items-start max-w-6xl mx-auto">
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
                  <p className="text-2xl font-semibold text-gray-900 mb-3">{formattedPrice}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 pb-3 border-b">
                  {listing.location && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{listing.location}</span>
                  )}
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3 shrink-0" />{formatPostedDate(listing.created_at)}</span>
                  {listing.category && (
                    <Badge variant="secondary" className="text-[10px] font-normal text-gray-600">{listing.category}</Badge>
                  )}
                </div>
              </div>

              {/* Video embed */}
              {listing.video_url && (
                <div>
                  <VideoEmbed url={listing.video_url} title={listing.title} />
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
              </div>

              {/* Like / save / share — was missing entirely on events */}
              <ListingEngagementBar
                listingId={listing.id}
                likesCount={listing.likes_count ?? 0}
                savesCount={listing.saves_count ?? 0}
              />

              {/* Tagged business */}
              {taggedBusinessCard}

              {/* Organizer — quiet row, not a boxed checkout card */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Organizador</p>

                {listing.store ? (
                  <div className="flex items-center gap-3">
                    <Link href={`/stores/${listing.store.slug}`} className="relative h-10 w-10 rounded-xl bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
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
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold overflow-hidden shrink-0">
                      {listing.profile.avatar_url ? (
                        <Image src={listing.profile.avatar_url} alt={listing.profile.display_name} fill className="object-cover" />
                      ) : listing.profile.display_name[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="flex items-center gap-2">
                        <Link href={`/users/${listing.profile.username}`} className="text-sm font-semibold hover:underline">
                          {listing.profile.display_name}
                        </Link>
                        {listing.profile.username === 'ventastecate' && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-gray-500"><BadgeCheck className="h-3.5 w-3.5 text-orange-600" />Cuenta oficial</span>
                        )}
                      </span>
                      <p className="text-xs text-gray-500">@{listing.profile.username}</p>
                    </div>
                  </div>
                )}

                </div>
                {!isOwner && listing.status === 'active' && user && (
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link href={`/messages?listing=${listing.id}&seller=${listing.user_id}`}>Contactar</Link>
                  </Button>
                )}
                {!isOwner && listing.status === 'active' && !user && (
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link href="/login">Iniciar sesión para contactar</Link>
                  </Button>
                )}
                {isOwner && (
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link href={`/listings/${listing.id}/edit`}>Editar Anuncio</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Comments below the poster/info grid, not crammed in the right column */}
          <div className="max-w-3xl mx-auto mt-8">
            <CommentSection
              listingId={listing.id}
              initialComments={comments}
              currentUserId={user?.id ?? null}
            />
          </div>
          </>
        ) : (
          /* ── Default layout: gallery left, sticky buy-box right ── */
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8 items-start max-w-6xl mx-auto">
            {/* Left Column — gallery + details */}
            <div className="min-w-0 space-y-5">
              <ListingImageGallery
                images={sortedImages}
                listingTitle={listing.title}
                isSold={listing.status === 'sold'}
                listingType={listingType}
                actions={
                  <ListingEngagementBar
                    listingId={listing.id}
                    likesCount={listing.likes_count ?? 0}
                    savesCount={listing.saves_count ?? 0}
                    variant="overlay"
                  />
                }
              />

              {/* Video embed */}
              {listing.video_url && (
                <div className="max-w-2xl">
                  <VideoEmbed url={listing.video_url} title={listing.title} />
                </div>
              )}

              {/* Mobile: title + price under the gallery (desktop shows these in the right buy-box) */}
              <div className="lg:hidden">
                <h1 className="text-xl font-semibold leading-snug mb-1">{listing.title}</h1>
                <p className="text-2xl font-semibold text-gray-900 mb-2">{formattedPrice}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-gray-500">
                  {listing.location && (
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{listing.location}</span>
                  )}
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" />{formatPostedDate(listing.created_at)}</span>
                  {listing.category && (
                    <Badge variant="secondary" className="text-[11px] font-normal text-gray-600">{listing.category}</Badge>
                  )}
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
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-lg font-semibold">{meta.bedrooms}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Bed className="h-3 w-3" /> Recámaras</div>
                          </div>
                        )}
                        {meta.bathrooms != null && (
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-lg font-semibold">{meta.bathrooms}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Droplets className="h-3 w-3" /> Baños</div>
                          </div>
                        )}
                        {meta.construction_m2 != null && (
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-lg font-semibold">{meta.construction_m2}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Ruler className="h-3 w-3" /> m² Const.</div>
                          </div>
                        )}
                        {meta.lot_m2 != null && (
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-lg font-semibold">{meta.lot_m2}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Home className="h-3 w-3" /> m² Terreno</div>
                          </div>
                        )}
                        {meta.parking_spots != null && (
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
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
                        <div className="text-center p-3 bg-gray-50 rounded-xl">
                          <p className="text-lg font-semibold">{meta.year}</p>
                          <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Calendar className="h-3 w-3" /> Año</div>
                        </div>
                        {meta.mileage_km != null && (
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-lg font-semibold">{meta.mileage_km.toLocaleString()}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Gauge className="h-3 w-3" /> km</div>
                          </div>
                        )}
                        {meta.transmission && (
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-lg font-semibold">{transLabels[meta.transmission] || meta.transmission}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Settings className="h-3 w-3" /> Trans.</div>
                          </div>
                        )}
                        {meta.fuel_type && (
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-lg font-semibold">{fuelLabels[meta.fuel_type] || meta.fuel_type}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Fuel className="h-3 w-3" /> Comb.</div>
                          </div>
                        )}
                        {meta.color && (
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-lg font-semibold">{meta.color}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><Palette className="h-3 w-3" /> Color</div>
                          </div>
                        )}
                        {meta.doors != null && (
                          <div className="text-center p-3 bg-gray-50 rounded-xl">
                            <p className="text-lg font-semibold">{meta.doors}</p>
                            <div className="text-xs text-gray-500 flex items-center justify-center gap-1"><DoorOpen className="h-3 w-3" /> Puertas</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Description */}
                <div className="pt-1">
                  <h2 className="text-base font-semibold mb-3">Descripción</h2>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
                </div>

                {/* Tagged business */}
                {taggedBusinessCard}

                {/* Comments */}
                <CommentSection
                  listingId={listing.id}
                  initialComments={comments}
                  currentUserId={user?.id ?? null}
                />
            </div>

            {/* Right Column — sticky buy-box: title, price, meta, seller, contact */}
            <aside className="lg:sticky lg:top-4">
              <div className="border rounded-xl p-5">
                {/* Title/price/meta — desktop only; mobile shows them under the gallery */}
                <div className="hidden lg:block">
                  <h1 className="text-xl font-semibold leading-snug mb-1.5">{listing.title}</h1>
                  <p className="text-2xl font-semibold text-gray-900 mb-3">{formattedPrice}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-gray-500 pb-4 border-b">
                    {listing.location && (
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0" />{listing.location}</span>
                    )}
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" />{formatPostedDate(listing.created_at)}</span>
                    {listing.category && (
                      <Badge variant="secondary" className="text-[11px] font-normal text-gray-600">{listing.category}</Badge>
                    )}
                  </div>
                </div>

                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide lg:mt-4 mb-3">
                  {isService ? 'Proveedor' : 'Vendedor'}
                </p>

                {listing.store ? (
                  <div className="flex items-center gap-3">
                    <Link href={`/stores/${listing.store.slug}`} className="relative h-11 w-11 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                      {listing.store.avatar_url ? (
                        <Image src={listing.store.avatar_url} alt={listing.store.name} fill className="object-cover" />
                      ) : <Store className="h-5 w-5 text-gray-400" />}
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/stores/${listing.store.slug}`} className="text-sm font-semibold hover:underline block truncate">
                        {listing.store.name}
                      </Link>
                      <p className="text-xs text-gray-500 truncate">{listing.store.location || 'Tienda'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 rounded-full bg-gray-200 flex items-center justify-center text-base font-semibold overflow-hidden shrink-0">
                      {listing.profile.avatar_url ? (
                        <Image src={listing.profile.avatar_url} alt={listing.profile.display_name} fill className="object-cover" />
                      ) : listing.profile.display_name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/users/${listing.profile.username}`} className="text-sm font-semibold hover:underline block truncate">
                        {listing.profile.display_name}
                      </Link>
                      <p className="text-xs text-gray-500 truncate">@{listing.profile.username}</p>
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
                {!isOwner && listing.status === 'active' && sellerWhatsapp && (
                  <Button asChild variant="outline" className="w-full mt-2">
                    <a
                      href={`https://wa.me/${String(sellerWhatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vi tu anuncio "${listing.title}" en ventasTecate.com y me interesa.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp al vendedor
                    </a>
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
                    <p className="text-sm text-center text-gray-500">Este es tu anuncio</p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {!isOwner && (
          <div className="max-w-4xl mx-auto mt-8 pt-4 border-t border-gray-100 flex justify-center">
            <ReportListingButton listingId={listing.id} listingTitle={listing.title} />
          </div>
        )}
      </main>
      </div>
    </>
  )
}
