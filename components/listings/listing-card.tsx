import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ListingWithImages } from '@/lib/types/database'

interface ListingCardProps {
  listing: ListingWithImages
}

export function ListingCard({ listing }: ListingCardProps) {
  const primaryImage = listing.images?.[0]?.image_url || '/placeholder.jpg'
  const formattedPrice = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(listing.price)

  return (
    <Link href={`/listings/${listing.id}`} className="group">
      <div className="overflow-hidden rounded-lg border bg-white hover:shadow-md transition-shadow">
        <div className="relative aspect-square bg-gray-100">
          <Image
            src={primaryImage}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
          {listing.status === 'sold' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary" className="text-xs">
                Vendido
              </Badge>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
            {listing.title}
          </h3>
          <p className="text-lg font-semibold text-gray-900 mb-2">
            {formattedPrice}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="truncate">{listing.location}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
