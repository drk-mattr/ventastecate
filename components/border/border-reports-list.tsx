'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useAuthModal } from '@/lib/auth/auth-modal-context'
import {
  DIRECTION_LABELS,
  LANE_LABELS,
  formatWait,
  type BorderDirection,
  type BorderLane,
  type BorderReportStatus,
} from '@/lib/border/estimate'

export type RecentBorderReport = {
  id: string
  lane: BorderLane
  direction: BorderDirection
  wait_minutes: number
  status: BorderReportStatus
  created_at: string
  /** "hace 8 min" — computed server-side (no Date.now() in render). */
  ageLabel: string
  username: string
  display_name: string
  confirms: number
  denies: number
}

// Recent-reports list for La Garita (proposal §5.5): the last
// ~10 reports, newest first — real people, real times. Each row
// carries the Waze-style confirm/deny vote ("¿Sigue así?").
// A vote needs sign-in; signed-out visitors get the login prompt.
export function BorderReportsList({
  reports,
  userVotes,
}: {
  reports: RecentBorderReport[]
  /** This user's vote per report id, when signed in. */
  userVotes: Record<string, 'confirma' | 'niega'>
}) {
  const { user } = useAuth()
  const { openAuth } = useAuthModal()
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const vote = async (reportId: string, v: 'confirma' | 'niega') => {
    if (!user) {
      openAuth('login')
      return
    }
    if (pendingId) return
    setPendingId(reportId)
    try {
      await fetch('/api/border/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, vote: v }),
      })
      router.refresh()
    } catch {
      // A failed vote just doesn't land; the list stays as-is.
    }
    setPendingId(null)
  }

  if (reports.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Aún no hay reportes de la comunidad — sé el primero.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-gray-100">
      {reports.map((r) => {
        const mine = userVotes[r.id]
        return (
          <li key={r.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm text-gray-900">
                <span className="font-semibold">{formatWait(r.wait_minutes)}</span>
                {' · '}
                {LANE_LABELS[r.lane]} · {DIRECTION_LABELS[r.direction]}
                {' · '}
                {r.status === 'ya_cruce' ? 'Ya cruzó' : 'En la fila'}
              </p>
              <span className="shrink-0 text-xs text-gray-500">{r.ageLabel}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="truncate text-xs text-gray-500">@{r.username}</p>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-xs text-gray-500">¿Sigue así?</span>
                <button
                  type="button"
                  disabled={pendingId === r.id}
                  onClick={() => vote(r.id, 'confirma')}
                  aria-label="Confirmar que sigue así"
                  className={`rounded-full border px-2 py-1 text-xs font-medium ${
                    mine === 'confirma'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-900'
                  }`}
                >
                  ✓{r.confirms > 0 ? ` ${r.confirms}` : ''}
                </button>
                <button
                  type="button"
                  disabled={pendingId === r.id}
                  onClick={() => vote(r.id, 'niega')}
                  aria-label="Negar que sigue así"
                  className={`rounded-full border px-2 py-1 text-xs font-medium ${
                    mine === 'niega'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-900'
                  }`}
                >
                  ✗{r.denies > 0 ? ` ${r.denies}` : ''}
                </button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
