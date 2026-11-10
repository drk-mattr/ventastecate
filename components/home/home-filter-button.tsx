'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { SearchFilters } from '@/components/search/search-filters'

// Home Filtros (mobile home only): the OfferUp-style sliders entry
// point that replaces the type-tabs row + Categorías grid icon. The
// sheet reuses the /search filter panel (SearchFilters) — keyword and
// location hidden (header search already exists; location is the
// site-wide header setting) — and applying navigates to /search,
// exactly like the tabs did. The home feed itself takes no filter
// params; filtering in place is out of scope.
export function HomeFilterButton({ activeCount = 0 }: { activeCount?: number }) {
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Filtros"
        title="Filtros"
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Filtros">
          <div aria-hidden="true" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
            <div className="flex items-center justify-end px-4 pt-3 pb-1">
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4">
              <SearchFilters hideQuery hideLocation bare onApply={() => setOpen(false)} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
