'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  LayoutGrid, Tag, Wrench, Megaphone, Newspaper,
  UtensilsCrossed, KeyRound, Home, LandPlot,
} from 'lucide-react'

// Icon filter pills, OfferUp-style: one row, horizontally scrollable,
// selected pill filled. The old version was plain text links with no
// selected state — it read as a website nav, not an app filter row.
// Same 9 destinations as before; nothing was removed, only restyled.
// Rendered on the homepage AND on /search. A pill changes only its
// own axis (type or category) and keeps everything else in the URL —
// so switching to Productos while searching "mesita" keeps the query
// and the other filters instead of dropping them.
const SHORTCUTS = [
  { label: 'Todo', icon: LayoutGrid, match: () => true, set: { type: null, category: null } },
  { label: 'Productos', icon: Tag, match: (p: URLSearchParams) => p.get('type') === 'product', set: { type: 'product', category: null } },
  { label: 'Servicios', icon: Wrench, match: (p: URLSearchParams) => p.get('type') === 'service', set: { type: 'service', category: null } },
  { label: 'Eventos', icon: Megaphone, match: (p: URLSearchParams) => p.get('type') === 'event', set: { type: 'event', category: null } },
  { label: 'Noticias', icon: Newspaper, match: (p: URLSearchParams) => p.get('type') === 'news', set: { type: 'news', category: null } },
  { label: 'Comida', icon: UtensilsCrossed, match: (p: URLSearchParams) => p.get('category') === 'Comida', set: { type: null, category: 'Comida' } },
  { label: 'Casas: Renta', icon: KeyRound, match: (p: URLSearchParams) => p.get('category') === 'Casas en Renta', set: { type: null, category: 'Casas en Renta' } },
  { label: 'Casas: Venta', icon: Home, match: (p: URLSearchParams) => p.get('category') === 'Casas en Venta', set: { type: null, category: 'Casas en Venta' } },
  { label: 'Terrenos', icon: LandPlot, match: (p: URLSearchParams) => p.get('category') === 'Terrenos', set: { type: null, category: 'Terrenos' } },
]

export function TypeShortcuts() {
  const params = useSearchParams()
  const hasFilter = params.get('type') || params.get('category')

  const hrefFor = (set: { type: string | null; category: string | null }) => {
    const next = new URLSearchParams(params.toString())
    if (set.type) next.set('type', set.type)
    else next.delete('type')
    if (set.category) next.set('category', set.category)
    else next.delete('category')
    const qs = next.toString()
    return qs ? `/search?${qs}` : '/search'
  }

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-2 flex gap-2 overflow-x-auto sm:justify-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {SHORTCUTS.map((s) => {
          const Icon = s.icon
          // Todo is the default: active only when no type/category filter is set.
          const active = s.label === 'Todo' ? !hasFilter : s.match(params)
          return (
            <Link
              key={s.label}
              href={hrefFor(s.set)}
              aria-current={active ? 'true' : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 h-9 text-xs font-medium transition-colors ${
                active
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
