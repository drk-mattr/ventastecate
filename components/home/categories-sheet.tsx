'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import {
  LayoutGrid, X, KeyRound, Home, LandPlot, UtensilsCrossed,
  ChevronRight, Check,
} from 'lucide-react'

// The four category destinations the tab row doesn't hold: Casas first
// (Renta / Venta / Terrenos under a "Casas en Tecate" heading — the most
// valuable category on mobile, buried at the end of the old scrolling
// pill row), then Gastro. Icon-only trigger, OfferUp browse affordance;
// opens a bottom sheet above the bottom nav (z-50), closable by
// tap-outside, X, or Escape. Rows link to the same destinations the old
// pills linked to, and change only their own axis (type/category),
// keeping the rest of the URL — same behaviour as the tab row.
// Gastro is the exception: it is a route, not a filter, so it carries
// a plain href and is active on /gastro.
type SheetRow = {
  label: string
  icon: typeof LayoutGrid
  match?: (p: URLSearchParams) => boolean
  set?: { type: string | null; category: string | null }
  href?: string
}

const SECTIONS: { heading: string; rows: SheetRow[] }[] = [
  {
    heading: 'Casas en Tecate',
    rows: [
      { label: 'Casas en Renta', icon: KeyRound, match: (p: URLSearchParams) => p.get('category') === 'Casas en Renta', set: { type: null, category: 'Casas en Renta' } },
      { label: 'Casas en Venta', icon: Home, match: (p: URLSearchParams) => p.get('category') === 'Casas en Venta', set: { type: null, category: 'Casas en Venta' } },
      { label: 'Terrenos', icon: LandPlot, match: (p: URLSearchParams) => p.get('category') === 'Terrenos', set: { type: null, category: 'Terrenos' } },
    ],
  },
  {
    heading: 'Más categorías',
    rows: [
      { label: 'Gastro', icon: UtensilsCrossed, href: '/gastro' },
    ],
  },
]

export function CategoriesSheet() {
  const params = useSearchParams()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Escape closes; lock body scroll while the sheet is up.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  // Mirrors the tab row's href builder in type-shortcuts.tsx — same
  // URL behaviour (change only type/category, keep the rest).
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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Categorías"
        title="Categorías"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Categorías">
          <div aria-hidden="true" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <h2 className="text-base font-semibold text-gray-900">Categorías</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            {SECTIONS.map((section, i) => (
              <div key={section.heading} className={i > 0 ? 'border-t border-gray-100 mt-2 pt-2' : ''}>
                <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{section.heading}</p>
                {section.rows.map((row) => {
                  const Icon = row.icon
                  const active = row.href ? pathname === row.href : row.match?.(params)
                  return (
                    <Link
                      key={row.label}
                      href={row.href ?? hrefFor(row.set!)}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <Icon className="h-5 w-5 text-gray-700" />
                      </span>
                      <span className={`flex-1 text-sm ${active ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{row.label}</span>
                      {active
                        ? <Check className="h-4 w-4 shrink-0 text-gray-900" />
                        : <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />}
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
