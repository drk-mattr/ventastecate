import Link from 'next/link'
import Image from 'next/image'
import { Wrench, Megaphone, Store } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ListingWithImages } from '@/lib/types/database'

interface ListingCardProps {
  listing: ListingWithImages
}

const TYPE_STYLES = {
  service: { gradient: 'from-blue-600 to-blue-800' },
  event: { gradient: 'from-amber-500 to-orange-600' },
  product: { gradient: 'from-gray-500 to-gray-700' },
} as const

const TYPE_BADGE: Record<string, { icon: React.ElementType; label: string } | null> = {
  service: { icon: Wrench, label: 'Servicio' },
  event: { icon: Megaphone, label: 'Evento' },
  product: null,
}

export function ListingCard({ listing }: ListingCardProps) {
  const hasImages = listing.images && listing.images.length > 0
  const primaryImage = hasImages ? listing.images[0].image_url : null
  const listingType = listing.listing_type || 'product'
  const isService = listingType === 'service'
  const isEvent = listingType === 'event'

  const formattedPrice = listing.price > 0
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(listing.price)
    : null

  // Event card: poster-first layout with natural image height
  if (isEvent && primaryImage) {
    return (
      <Link href={`/listings/${listing.id}`} className="group">
        <div className="overflow-hidden rounded-lg border bg-white hover:shadow-md transition-shadow">
          <div className="relative bg-black">
            <Image
              src={primaryImage}
              alt={listing.title}
              width={400}
              height={600}
              className="w-full h-auto"
            />
            {listing.status === 'sold' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Badge variant="secondary" className="text-xs">Vendido</Badge>
              </div>
            )}
          </div>
          {/* Minimal info strip */}
          <div className="px-2.5 py-2 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 truncate">{listing.location}</span>
            {formattedPrice && (
              <span className="text-xs font-semibold shrink-0">{formattedPrice}</span>
            )}
          </div>
        </div>
      </Link>
    )
  }

  // Standard card: products, services, no-image events
  return (
    <Link href={`/listings/${listing.id}`} className="group">
      <div className="overflow-hidden rounded-lg border bg-white hover:shadow-md transition-shadow">
        <div className="relative aspect-square bg-gray-100">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            /* Title-as-hero for listings without images */
            <div className={`absolute inset-0 bg-gradient-to-br ${TYPE_STYLES[listingType]?.gradient || TYPE_STYLES.product.gradient} flex items-center justify-center p-4`}>
              <p className="text-white font-bold text-2xl leading-snug text-center">
                {listing.title}
              </p>
            </div>
          )}
          {listing.status === 'sold' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary" className="text-xs">
                Vendido
              </Badge>
            </div>
          )}
        </div>
        <div className="p-3">
          {primaryImage && (
            <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
              {listing.title}
            </h3>
          )}
          <p className="text-lg font-semibold text-gray-900 mb-2">
            {formattedPrice || 'Consultar precio'}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="truncate">{listing.location}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            {TYPE_BADGE[listingType] && (() => {
              const badge = TYPE_BADGE[listingType]!
              const Icon = badge.icon
              return (
                <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                  <Icon className="h-3 w-3" />{badge.label}
                </span>
              )
            })()}
            {listing.store && (
              <span className="text-[11px] text-gray-400 flex items-center gap-0.5 truncate">
                <Store className="h-3 w-3 shrink-0" />{listing.store.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
