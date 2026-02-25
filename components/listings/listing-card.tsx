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
    <Link href={`/listings/${listing.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative aspect-[4/3] bg-gray-100">
          <Image
            src={primaryImage}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {listing.status === 'sold' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Badge variant="secondary" className="text-lg">
                Vendido
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-1 mb-1">
            {listing.title}
          </h3>
          <p className="text-2xl font-bold text-blue-600 mb-2">
            {formattedPrice}
          </p>
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {listing.description}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Badge variant="outline">{listing.category}</Badge>
            <span>•</span>
            <span>{listing.location}</span>
          </div>
        </CardContent>
        <CardFooter className="px-4 py-3 bg-gray-50 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium">
              {listing.profile.display_name[0].toUpperCase()}
            </div>
            <span>{listing.profile.display_name}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
