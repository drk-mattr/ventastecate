// Items engine — one offer row, shared by the live type page and the
// demo preview (/demo/tipos). Extracted from app/tipos/[slug]/page.tsx
// (034C/034D) so both renderings cannot drift apart: the row, its
// evidence line and its rank number live here and nowhere else.
//
// The rank number shows only when the list is a real ranking (gate
// passed, §7.3); unranked lists show the same rows without numbers.

import Link from 'next/link'
import { Tag } from 'lucide-react'

export type BusinessRow = {
  id: string
  name: string
  category: string | null
  city: string | null
  location: string | null
  image_url: string | null
}

export type Offer = {
  itemId: string
  business: BusinessRow
  kindId: string
  kindName: string
  origin: string
  createdAt: string
  mentionCount: number
  contributors: number
  photoUrl: string | null
}

export function OfferRow({
  offer,
  rank,
  multiKind,
}: {
  offer: Offer
  rank?: number
  multiKind: boolean
}) {
  return (
    <li className="flex items-start gap-3">
      {rank !== undefined && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white text-xs font-semibold mt-3">
          {rank}
        </span>
      )}
      {offer.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={offer.photoUrl}
          alt=""
          className="h-12 w-12 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <Tag className="h-5 w-5 text-gray-400" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <Link
          href={`/businesses/${offer.business.id}`}
          className="text-sm font-medium text-gray-900 hover:underline truncate block"
        >
          {offer.business.name}
        </Link>
        <p className="text-xs text-gray-500">
          {[offer.business.category, offer.business.city || offer.business.location]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {multiKind && <p className="text-xs text-gray-400">{offer.kindName}</p>}
        <p className="text-xs text-gray-500">
          {offer.contributors > 0
            ? `Mencionados por ${offer.contributors} ${offer.contributors === 1 ? 'persona' : 'personas'}`
            : offer.origin === 'owner_claim'
              ? 'Agregado por el dueño'
              : 'Agregados por la comunidad · Sin menciones'}
        </p>
      </div>
    </li>
  )
}
