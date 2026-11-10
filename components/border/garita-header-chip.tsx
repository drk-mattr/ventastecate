'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LANE_LABELS,
  formatAge,
  formatWait,
  type BorderLane,
} from '@/lib/border/estimate'

type LaneCurrent = {
  minutes: number | null
  ageMinutes: number | null
  source: 'community' | 'cbp' | null
  isCounting: boolean
  hasCurrent: boolean
}

type CurrentData = {
  lanes: Record<BorderLane, LaneCurrent>
}

const QUICK_LANES: BorderLane[] = ['auto', 'peatonal', 'comercial']

// The Garita chip in the header, right of the search bar: the
// live Auto-north headline as the trigger ("Garita · 120 min
// (hace 5 min)") — and a dropdown, not a link. Freshness is text
// only, monochrome, no colored dots. When there is no current
// number (stale or no data at all) it renders plain "Garita"
// with no time — a stale number is never shown as current, same
// rule as the page.
//
// The menu: a 3-lane quick view (same /api/border/current fetch
// as the trigger, so no new polling), "Ver la garita", and
// "Reportar la fila" (opens the report dialog via onReport).
// The dropdown is a menu, not a form — the report form stays in
// its sheet.
//
// One headline rule (audit §1.5): the chip shows the same
// estimate the /garita headline shows, computed no more than 60
// seconds apart. The chip refetches the instant a report is
// posted (the dialog dispatches a `border:updated` event next to
// its router.refresh()), on window focus, and every 60 s —
// never the old 5-minute poll, which let the chip sit on a
// pre-report number while the page had already moved on.
export function GaritaHeaderChip({ onReport }: { onReport: () => void }) {
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

  const auto = current?.lanes?.auto

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hidden lg:inline-flex items-center gap-1 shrink-0 whitespace-nowrap text-sm text-gray-700 hover:text-gray-900"
          aria-label="Garita — tiempos de espera en la frontera"
        >
          <span className="font-medium">Garita</span>
          {auto?.hasCurrent && auto.minutes !== null && (
            <>
              <span className="font-semibold text-gray-900">· {auto.minutes} min</span>
              {auto.isCounting && (
                <span className="hidden text-gray-500 xl:inline">y contando</span>
              )}
              <span className="hidden text-gray-500 xl:inline">({formatAge(auto.ageMinutes)})</span>
            </>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {current === null ? (
          <p className="px-2 py-1.5 text-xs text-gray-500">Sin datos por ahora</p>
        ) : (
          QUICK_LANES.map((lane) => {
            const laneData = current.lanes[lane]
            return (
              <div
                key={lane}
                className="flex items-baseline justify-between gap-2 px-2 py-1.5"
              >
                <span className="text-xs text-gray-900">{LANE_LABELS[lane]}</span>
                {laneData?.hasCurrent && laneData.minutes !== null ? (
                  <span className="text-xs text-gray-900">
                    <span className="font-semibold">{formatWait(laneData.minutes)}</span>
                    <span className="text-[11px] text-gray-500">
                      {' '}
                      · {laneData.source === 'community' ? 'Comunidad' : 'CBP'} ·{' '}
                      {formatAge(laneData.ageMinutes)}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">— sin datos</span>
                )}
              </div>
            )
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="text-xs">
          <Link href="/garita">Ver la garita</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onReport()} className="text-xs">
          Reportar la fila
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
