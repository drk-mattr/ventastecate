'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutGrid, Tag, Wrench, Megaphone, Newspaper,
  UtensilsCrossed, KeyRound, Home, LandPlot,
} from 'lucide-react'
import { CategoriesSheet } from '@/components/home/categories-sheet'

// Two presentations of the same 9 destinations, switched by
// breakpoint — the user asked for the desktop pills back after
// PR #139 put the mobile tab row on every width:
//
// - Desktop (sm+): the original pill row, restored verbatim from
//   before PR #139 — bordered pills with icons, h-9, selected pill
//   filled black, centered via sm:justify-center.
// - Mobile (base): the PR #139 short text tabs, Airbnb / Facebook
//   Marketplace pattern — no icons, no pill borders, active tab is
//   black text + a 2px underline; five tabs fit a 390px phone
//   without scrolling. Everything else lives behind the Categorías
//   sheet (Casas first, then Gastro), which is mobile-only too —
//   on desktop all 9 destinations are visible as pills, so the
//   sheet is redundant there.
//
// Rendered on the homepage AND on /search. A shortcut changes only
// its own axis (type or category) and keeps everything else in the
// URL — so switching to Productos while searching "mesita" keeps
// the query and the other filters instead of dropping them.
// Gastro is the exception: it is a route, not a filter, so it
// carries a plain href and is active on /gastro.
type Shortcut = {
  label: string
  icon: typeof LayoutGrid
  match?: (p: URLSearchParams) => boolean
  set?: { type: string | null; category: string | null }
  href?: string
}

const SHORTCUTS: Shortcut[] = [
  { label: 'Todo', icon: LayoutGrid, match: () => true, set: { type: null, category: null } },
  { label: 'Productos', icon: Tag, match: (p: URLSearchParams) => p.get('type') === 'product', set: { type: 'product', category: null } },
  { label: 'Servicios', icon: Wrench, match: (p: URLSearchParams) => p.get('type') === 'service', set: { type: 'service', category: null } },
  { label: 'Eventos', icon: Megaphone, match: (p: URLSearchParams) => p.get('type') === 'event', set: { type: 'event', category: null } },
  { label: 'Noticias', icon: Newspaper, match: (p: URLSearchParams) => p.get('type') === 'news', set: { type: 'news', category: null } },
  { label: 'Gastro', icon: UtensilsCrossed, href: '/gastro' },
  { label: 'Casas: Renta', icon: KeyRound, match: (p: URLSearchParams) => p.get('category') === 'Casas en Renta', set: { type: null, category: 'Casas en Renta' } },
  { label: 'Casas: Venta', icon: Home, match: (p: URLSearchParams) => p.get('category') === 'Casas en Venta', set: { type: null, category: 'Casas en Venta' } },
  { label: 'Terrenos', icon: LandPlot, match: (p: URLSearchParams) => p.get('category') === 'Terrenos', set: { type: null, category: 'Terrenos' } },
]

const TABS = [
  { label: 'Todo', match: () => true, set: { type: null, category: null } },
  { label: 'Productos', match: (p: URLSearchParams) => p.get('type') === 'product', set: { type: 'product', category: null } },
  { label: 'Servicios', match: (p: URLSearchParams) => p.get('type') === 'service', set: { type: 'service', category: null } },
  { label: 'Eventos', match: (p: URLSearchParams) => p.get('type') === 'event', set: { type: 'event', category: null } },
  { label: 'Noticias', match: (p: URLSearchParams) => p.get('type') === 'news', set: { type: 'news', category: null } },
]

export function TypeShortcuts({ hideMobileTabs = false }: { hideMobileTabs?: boolean }) {
  const params = useSearchParams()
  const pathname = usePathname()
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
    // hideMobileTabs (home only): the whole mobile row — tabs + the
    // Categorías sheet trigger — leaves the home page; the Filtros
    // button in the feed header replaces it. The root hides on mobile
    // so it leaves no stray border behind; desktop pills are
    // untouched. /search passes nothing and keeps its tabs.
    <div className={`border-b bg-white ${hideMobileTabs ? 'hidden sm:block' : ''}`}>
      {/* Desktop pills — sm+ only, restored from before PR #139. */}
      <div className="container mx-auto px-4 py-2 hidden sm:flex gap-2 overflow-x-auto sm:justify-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {SHORTCUTS.map((s) => {
          const Icon = s.icon
          // Todo is the default: active only when no type/category filter is set.
          // A route shortcut (Gastro) is active on its own path.
          const active = s.href
            ? pathname === s.href
            : s.label === 'Todo'
              ? !hasFilter
              : s.match?.(params)
          return (
            <Link
              key={s.label}
              href={s.href ?? hrefFor(s.set!)}
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

      {/* Mobile tabs — base only, from PR #139. Skipped on home
          when hideMobileTabs is set (see above). */}
      {!hideMobileTabs && (
      <div className="container mx-auto px-4 flex sm:hidden items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
            don't hold (Casas first, then Gastro) — icon-only, OfferUp
            browse affordance. Mobile-only: on desktop the pills above
            show all 9 destinations. */}
        <div className="ml-1 shrink-0 border-l border-gray-200 pl-1.5">
          <CategoriesSheet />
        </div>
      </div>
      )}
    </div>
  )
}
