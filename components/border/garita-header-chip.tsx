'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatAge } from '@/lib/border/estimate'

type CurrentData = {
  minutes: number | null
  ageMinutes: number | null
  source: 'community' | 'cbp' | null
  isCounting: boolean
  hasCurrent: boolean
}

// The Garita chip in the header, right of the search bar: a link
// to /garita carrying the live Auto-north headline — the same
// number the page shows ("Garita · 120 min (hace 5 min)").
// Freshness is text only, monochrome, no colored dots. When there
// is no current number (stale or no data at all) it renders plain
// "Garita" with no time — a stale number is never shown as
// current, same rule as the page.
//
// One headline rule (audit §1.5): the chip shows the same
// estimate the /garita headline shows, computed no more than 60
// seconds apart. The chip refetches the instant a report is
// posted (the sheet dispatches a `border:updated` event next to
// its router.refresh()), on window focus, and every 60 s —
// never the old 5-minute poll, which let the chip sit on a
// pre-report number while the page had already moved on.
export function GaritaHeaderChip() {
  const [current, setCurrent] = useState<CurrentData | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/border/current')
        if (!res.ok) return
        const data: CurrentData = await res.json()
        if (!cancelled) setCurrent(data)
      } catch {
        // Silent failure: keep the last good value.
      }
    }
    const onFocus = () => {
      if (document.visibilityState === 'visible') void load()
    }
    load()
    const timer = setInterval(load, 60 * 1000)
    window.addEventListener('border:updated', load)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('border:updated', load)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  return (
    <Link
      href="/garita"
      className="hidden sm:inline-flex items-center gap-1 shrink-0 whitespace-nowrap text-sm text-gray-700 hover:text-gray-900"
      aria-label="Garita — tiempos de espera en la frontera"
    >
      <span className="font-medium">Garita</span>
      {current?.hasCurrent && current.minutes !== null && (
        <>
          <span className="font-semibold text-gray-900">· {current.minutes} min</span>
          {current.isCounting && (
            <span className="text-gray-500">y contando</span>
          )}
          <span className="text-gray-500">({formatAge(current.ageMinutes)})</span>
        </>
      )}
    </Link>
  )
}
