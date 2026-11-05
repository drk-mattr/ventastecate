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
// Rendered on the homepage only; on /search the same pills would read
// their active state from the URL params.
const SHORTCUTS = [
  { label: 'Todo', href: '/search', icon: LayoutGrid, match: () => true },
  { label: 'Productos', href: '/search?type=product', icon: Tag, match: (p: URLSearchParams) => p.get('type') === 'product' },
  { label: 'Servicios', href: '/search?type=service', icon: Wrench, match: (p: URLSearchParams) => p.get('type') === 'service' },
  { label: 'Eventos', href: '/search?type=event', icon: Megaphone, match: (p: URLSearchParams) => p.get('type') === 'event' },
  { label: 'Noticias', href: '/search?type=news', icon: Newspaper, match: (p: URLSearchParams) => p.get('type') === 'news' },
  { label: 'Comida', href: '/search?category=Comida', icon: UtensilsCrossed, match: (p: URLSearchParams) => p.get('category') === 'Comida' },
  { label: 'Casas: Renta', href: '/search?category=Casas%20en%20Renta', icon: KeyRound, match: (p: URLSearchParams) => p.get('category') === 'Casas en Renta' },
  { label: 'Casas: Venta', href: '/search?category=Casas%20en%20Venta', icon: Home, match: (p: URLSearchParams) => p.get('category') === 'Casas en Venta' },
  { label: 'Terrenos', href: '/search?category=Terrenos', icon: LandPlot, match: (p: URLSearchParams) => p.get('category') === 'Terrenos' },
]

export function TypeShortcuts() {
  const params = useSearchParams()
  const hasFilter = params.get('type') || params.get('category')

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {SHORTCUTS.map((s) => {
          const Icon = s.icon
          // Todo is the default: active only when no type/category filter is set.
          const active = s.label === 'Todo' ? !hasFilter : s.match(params)
          return (
            <Link
              key={s.label}
              href={s.href}
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
