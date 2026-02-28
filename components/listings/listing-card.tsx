import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { ListingWithImages } from '@/lib/types/database'

interface ListingCardProps {
  listing: ListingWithImages
}

const TYPE_STYLES = {
  service: { gradient: 'from-blue-600 to-blue-800', badge: '🔧 Servicio' },
  event: { gradient: 'from-amber-500 to-orange-600', badge: '📢 Evento' },
  product: { gradient: 'from-gray-500 to-gray-700', badge: '' },
} as const

export function ListingCard({ listing }: ListingCardProps) {
  const hasImages = listing.images && listing.images.length > 0
  const primaryImage = hasImages ? listing.images[0].image_url : null
  const listingType = listing.listing_type || 'product'
  const isService = listingType === 'service'
  const isEvent = listingType === 'event'

  const formattedPrice = listing.price > 0
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(listing.price)
    : null

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
          {/* Only show title text below if there's an image (avoid repeating when title IS the hero) */}
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
            {(isService || isEvent) && (
              <span className="text-[11px] text-gray-400">
                {TYPE_STYLES[listingType].badge}
              </span>
            )}
            {listing.store && (
              <span className="text-[11px] text-gray-400 truncate">
                🏪 {listing.store.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
