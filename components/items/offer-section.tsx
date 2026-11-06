// Items engine — one offer list section, shared by the live type page
// and the demo preview (/demo/tipos). Same section shell the type page
// has rendered since 034C: heading, 1-col (phone) / 2-col (sm+) grid
// of OfferRow, optional honest note underneath.
//
// `ranked` decides whether rows carry rank numbers (gate passed, §7.3);
// unranked lists show the same rows without numbers.

import { OfferRow } from './offer-row'
import type { Offer } from './offer-row'

export function OfferSection({
  title,
  offers,
  ranked,
  multiKind,
  note,
}: {
  title: string
  offers: Offer[]
  ranked: boolean
  multiKind: boolean
  note?: string | null
}) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold mb-3">{title}</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {offers.map((o, i) => (
          <OfferRow
            key={o.itemId}
            offer={o}
            rank={ranked ? i + 1 : undefined}
            multiKind={multiKind}
          />
        ))}
      </ul>
      {note ? <p className="text-xs text-gray-400 mt-3">{note}</p> : null}
    </section>
  )
}
