'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CategoriesSheet } from '@/components/home/categories-sheet'

// Short text tabs, Airbnb / Facebook Marketplace pattern: no icons, no
// pill borders — the active tab is black text + a 2px underline. Five
// tabs fit a 390px phone without scrolling (text-xs, tight padding);
// everything else lives behind the Categorías sheet. Same 9
// destinations as the old pill row; nothing removed, only reorganised:
// the tabs hold the five type filters, the sheet holds the four
// category destinations (Casas first, then Comida).
// Rendered on the homepage AND on /search. A tab changes only its own
// axis (type or category) and keeps everything else in the URL —
// so switching to Productos while searching "mesita" keeps the query
// and the other filters instead of dropping them.
const TABS = [
  { label: 'Todo', match: () => true, set: { type: null, category: null } },
  { label: 'Productos', match: (p: URLSearchParams) => p.get('type') === 'product', set: { type: 'product', category: null } },
  { label: 'Servicios', match: (p: URLSearchParams) => p.get('type') === 'service', set: { type: 'service', category: null } },
  { label: 'Eventos', match: (p: URLSearchParams) => p.get('type') === 'event', set: { type: 'event', category: null } },
  { label: 'Noticias', match: (p: URLSearchParams) => p.get('type') === 'news', set: { type: 'news', category: null } },
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
      <div className="container mx-auto px-4 flex items-center gap-1 overflow-x-auto sm:justify-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {TABS.map((t) => {
          // Todo is the default: active only when no type/category filter is set.
          const active = t.label === 'Todo' ? !hasFilter : t.match(params)
          return (
            <Link
              key={t.label}
              href={hrefFor(t.set)}
              aria-current={active ? 'true' : undefined}
              className={`whitespace-nowrap px-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                active
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {t.label}
            </Link>
          )
        })}
        {/* Categorías sheet: the four category destinations the tabs
            don't hold (Casas first, then Comida) — icon-only, OfferUp
            browse affordance. */}
        <div className="ml-1 shrink-0 border-l border-gray-200 pl-1.5">
          <CategoriesSheet />
        </div>
      </div>
    </div>
  )
}
