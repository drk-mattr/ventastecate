'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Flag, X } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { useAuthModal } from '@/lib/auth/auth-modal-context'
import {
  DIRECTION_LABELS,
  LANE_LABELS,
  PACE_LABELS,
  TAIL_LINE_LABELS,
  formatWait,
  type BorderDirection,
  type BorderLane,
  type BorderPace,
  type BorderReportStatus,
  type CbpFeedEntry,
  type DirectionFilter,
  type LaneFilter,
  type TailMarker,
} from '@/lib/border/estimate'

/** One user report in the activity feed — the same fields the
 *  old BorderFeed rendered, plus the entry kind. No avatar: the
 *  feed query fetches username + display_name only, as before. */
export type ActivityUserEntry = {
  kind: 'user'
  id: string
  user_id: string
  lane: BorderLane
  direction: BorderDirection
  wait_minutes: number
  status: BorderReportStatus
  created_at: string
  /** "hace 8 min" — computed server-side (no Date.now() in render). */
  ageLabel: string
  username: string
  display_name: string
  note: string | null
  photo_url: string | null
  /** Dynamics (migration 052): one person's pace + tail picks
   *  — shown as-is on the entry, never aggregated here. */
  pace: BorderPace | null
  tail_marker: TailMarker | null
  /** All votes on the post (not just the last 30 min — the
   *  estimate reads its own 30-minute window separately). */
  confirms: number
  denies: number
}

/** One chronological list, newest first: official CBP entries
 *  and community reports side by side, never blended — every
 *  line carries its source. */
export type ActivityEntry = CbpFeedEntry | ActivityUserEntry

const REPORT_REASONS = [
  { value: 'border_spam', label: 'Spam' },
  { value: 'border_offensive', label: 'Contenido ofensivo' },
  { value: 'border_other', label: 'Otro motivo' },
] as const

const LANE_FILTERS: { id: LaneFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'auto', label: 'Auto general' },
  { id: 'peatonal', label: 'A pie' },
  { id: 'comercial', label: 'Camiones' },
]

const DIRECTION_FILTERS: { id: DirectionFilter; label: string }[] = [
  { id: 'all', label: 'Ambas' },
  { id: 'norte', label: 'A EUA' },
  { id: 'sur', label: 'A México' },
]

// La Garita as one activity feed (vertical redesign 2026-11-10):
// the old community-only "La fila, en vivo" list and the CBP
// numbers in the table are now one chronological list — official
// entries (a read-only projection of the stored snapshots,
// deduped so a held number doesn't print every 30 min) and
// community reports, newest first, today only. CBP entries are
// read-only — no vote, no flag, no author; official data is not
// user content. User entries stay compact (text-lg minutes, a
// thumbnail instead of a full-width photo) but keep every
// interaction: confirm/deny votes, flag, photo expand, pace/tail,
// note. A photo never weighs in the estimate; the vote row is
// the agreement display, and a denied post stays visible — it
// just leaves the estimate.
export function BorderActivityFeed({
  entries,
  userVotes,
  laneFilter: controlledLaneFilter,
  directionFilter: controlledDirectionFilter,
  onFilterChange,
}: {
  entries: ActivityEntry[]
  /** This user's vote per report id, when signed in. */
  userVotes: Record<string, 'confirma' | 'niega'>
  /** Controlled filter (the lane table drives it). When absent
   *  the feed keeps its own filter state, as before. */
  laneFilter?: LaneFilter
  directionFilter?: DirectionFilter
  onFilterChange?: (lane: LaneFilter, direction: DirectionFilter) => void
}) {
  const { user } = useAuth()
  const { openAuth } = useAuthModal()
  const router = useRouter()
  const [internalLaneFilter, setInternalLaneFilter] = useState<LaneFilter>('all')
  const [internalDirectionFilter, setInternalDirectionFilter] =
    useState<DirectionFilter>('all')
  const laneFilter = controlledLaneFilter ?? internalLaneFilter
  const directionFilter = controlledDirectionFilter ?? internalDirectionFilter
  const setLaneFilter = (value: LaneFilter) => {
    if (onFilterChange) onFilterChange(value, directionFilter)
    else setInternalLaneFilter(value)
  }
  const setDirectionFilter = (value: DirectionFilter) => {
    if (onFilterChange) onFilterChange(laneFilter, value)
    else setInternalDirectionFilter(value)
  }
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())

  // Escape closes the expanded photo (same overlay pattern as
  // the story viewer).
  useEffect(() => {
    if (!expandedId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expandedId])

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
      // A failed vote just doesn't land; the feed stays as-is.
    }
    setPendingId(null)
  }

  const flag = async (reportId: string, reason: string) => {
    if (!user) {
      openAuth('login')
      return
    }
    const res = await fetch(`/api/border/${reportId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      setReportedIds((prev) => new Set(prev).add(reportId))
      setReportingId(null)
    }
  }

  // Chips filter both entry kinds; CBP entries are norte-only,
  // so "A México" shows community reports only.
  const filtered = entries.filter(
    (e) =>
      (laneFilter === 'all' || e.lane === laneFilter) &&
      (directionFilter === 'all' || e.direction === directionFilter),
  )
  const expanded =
    expandedId !== null
      ? (entries.find(
          (e) => e.kind === 'user' && e.id === expandedId,
        ) as ActivityUserEntry | undefined)
      : undefined

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'border-gray-900 bg-gray-900 text-white'
        : 'border-gray-300 bg-white text-gray-900 hover:border-gray-900'
    }`

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {LANE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setLaneFilter(f.id)}
            className={chipClass(laneFilter === f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {DIRECTION_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setDirectionFilter(f.id)}
            className={chipClass(directionFilter === f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {directionFilter === 'sur' && (
        <p className="mt-3 text-xs text-gray-500">
          Solo reportes de la comunidad — no hay dato oficial para entrar a México.
        </p>
      )}

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Aún no hay actividad hoy — sé el primero en reportar.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          {laneFilter !== 'all'
            ? `Aún no hay actividad hoy en ${LANE_LABELS[laneFilter]} — sé el primero.`
            : 'Aún no hay actividad hoy con ese filtro — sé el primero.'}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((entry) => {
            if (entry.kind === 'cbp') {
              // Official entry, read-only: age + source, minutes +
              // lane + open lanes, CBP's own label when present.
              // No vote, no flag — official data is not user
              // content.
              return (
                <article key={entry.id} className="rounded-xl border bg-white p-4">
                  <p className="text-sm">
                    <span className="text-gray-500">{entry.ageLabel} · </span>
                    <span className="font-semibold text-gray-900">CBP oficial</span>
                  </p>
                  <p className="mt-1.5 text-lg font-bold text-gray-900">
                    {entry.wait_minutes <= 0
                      ? 'Sin espera'
                      : `${entry.wait_minutes} min de espera`}
                    <span className="ml-1.5 text-sm font-medium text-gray-500">
                      {LANE_LABELS[entry.lane]}
                    </span>
                    {entry.lanes_open !== null && (
                      <span className="ml-1.5 text-sm font-medium text-gray-500">
                        · {entry.lanes_open}{' '}
                        {entry.lanes_open === 1 ? 'carril abierto' : 'carriles abiertos'}
                      </span>
                    )}
                  </p>
                  {entry.cbp_label && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      Actualización de CBP: {entry.cbp_label}
                    </p>
                  )}
                </article>
              )
            }

            const r = entry
            const mine = userVotes[r.id]
            const isOwn = user?.id === r.user_id
            // Pace + tail on one quiet line when present; the
            // tail is a fact only for auto + en_fila.
            const detailParts: string[] = []
            if (r.pace) detailParts.push(PACE_LABELS[r.pace])
            if (r.tail_marker && r.lane === 'auto' && r.status === 'en_fila') {
              detailParts.push(`Fila hasta ${TAIL_LINE_LABELS[r.tail_marker]}`)
            }
            return (
              <article
                key={r.id}
                id={`border-report-${r.id}`}
                className="rounded-xl border bg-white p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">@{r.username}</span>
                    <span className="text-gray-500"> · {r.ageLabel}</span>
                  </p>
                  <span className="shrink-0 text-xs text-gray-500">
                    {LANE_LABELS[r.lane]} · {DIRECTION_LABELS[r.direction]}
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold text-gray-900">
                  {formatWait(r.wait_minutes)}
                  {r.status === 'en_fila' && (
                    <span className="ml-2 text-sm font-medium text-gray-500">y contando</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {r.status === 'ya_cruce'
                    ? 'Ya cruzó — es el tiempo total que esperó.'
                    : 'En la fila — es lo que lleva esperando, no el total.'}
                </p>
                {detailParts.length > 0 && (
                  <p className="mt-1 text-[11px] text-gray-500">{detailParts.join(' · ')}</p>
                )}
                {r.note && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-900">
                    {r.note}
                  </p>
                )}
                {r.photo_url && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(r.id)}
                    aria-label="Ver foto de la fila en grande"
                    className="relative mt-3 block aspect-[4/3] w-40 overflow-hidden rounded-lg bg-gray-100"
                  >
                    <Image
                      src={r.photo_url}
                      alt={`Foto de la fila, ${LANE_LABELS[r.lane]} ${DIRECTION_LABELS[r.direction]}, ${r.ageLabel}`}
                      fill
                      className="object-cover"
                      sizes="160px"
                    />
                  </button>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
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
                  {/* Flag: opens a review in /admin/reports, never
                      hides the post. "Reportar" (wrong/offensive)
                      and "niega" (the wait is no longer true) are
                      two different buttons with two meanings. */}
                  {!isOwn &&
                    (reportedIds.has(r.id) ? (
                      <span className="text-[11px] text-gray-400">
                        Reporte enviado, gracias.
                      </span>
                    ) : reportingId === r.id ? (
                      <span className="flex flex-wrap items-center justify-end gap-1.5">
                        {REPORT_REASONS.map((reason) => (
                          <button
                            key={reason.value}
                            type="button"
                            onClick={() => void flag(r.id, reason.value)}
                            className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50"
                          >
                            {reason.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setReportingId(null)}
                          className="text-[11px] text-gray-400 hover:text-gray-600"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReportingId(r.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600"
                      >
                        <Flag className="h-3 w-3" /> Reportar
                      </button>
                    ))}
                </div>
                {r.denies > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    {r.denies === 1
                      ? '1 persona dice que ya no es así'
                      : `${r.denies} personas dicen que ya no es así`}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}

      {expanded?.photo_url && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black p-4"
          onClick={() => setExpandedId(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedId(null)}
            aria-label="Cerrar foto"
            className="absolute right-4 top-4 rounded-full bg-black/70 p-2 text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative h-full w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={expanded.photo_url}
              alt={`Foto de la fila, ${LANE_LABELS[expanded.lane]} ${DIRECTION_LABELS[expanded.direction]}, ${expanded.ageLabel}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </div>
  )
}
