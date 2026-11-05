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
  return (
    <div className="container mx-auto px-4 pt-5">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Negocios destacados</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((b) => (
          <Link key={b.id} href={`/businesses/${b.id}`} className="rounded-xl border bg-white px-4 py-3 hover:border-gray-400 transition-colors">
            <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {[b.category, b.location].filter(Boolean).join(' · ')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {b.mentionCount30} {b.mentionCount30 === 1 ? 'mención' : 'menciones'} recientes · {b.followersCount} {b.followersCount === 1 ? 'seguidor' : 'seguidores'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
