import Link from 'next/link'

export interface TopBusiness {
  id: string
  name: string
  location: string | null
  category: string | null
  mentionCount30: number
  followersCount: number
}

export function TopBusinesses({ items }: { items: TopBusiness[] }) {
  if (items.length < 3) return null
  // Dense phone-book style, like the /businesses index: ranked rows in
  // columns, two lines per business, no cards. Rank order is the alive
  // score (last 30 days), so this is what locals are actually
  // interacting with right now — not an all-time hall of fame.
  return (
    <div className="container mx-auto px-4 pt-5">
      <h2 className="text-base font-semibold text-gray-900 mb-2">Negocios destacados</h2>
      <ol className="columns-1 sm:columns-2 lg:columns-3 gap-6 border-y border-gray-200 py-1">
        {items.map((b, i) => (
          <li key={b.id} className="break-inside-avoid py-2 border-b border-gray-200">
            <Link href={`/businesses/${b.id}`} className="flex items-baseline gap-2 min-w-0">
              <span className="text-xs text-gray-400 tabular-nums shrink-0">{i + 1}.</span>
              <span className="text-sm font-semibold text-gray-900 hover:underline truncate">{b.name}</span>
            </Link>
            <p className="text-xs text-gray-500 truncate pl-5" title={[b.category, b.location, `${b.mentionCount30} menc. recientes`, `${b.followersCount} seg.`].filter(Boolean).join(' · ')}>
              {[b.category, b.location].filter(Boolean).join(' · ')}
              {` · ${b.mentionCount30} menc. recientes · ${b.followersCount} seg.`}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
