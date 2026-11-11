'use client'

// Items engine — the recommend gesture on the item view
// (/items/[id]).
//
// One question, "¿Lo recomendarías?", yes or no — no stars, no
// 10/10 (Gastro v1 decision, 2026-11-11). Tapping your active
// answer again clears it. The opinion goes through POST
// /api/items/[id]/feedback (rate-limited, owner-blocked, plain
// Spanish errors); the count is the aggregate, and it only shows
// once 5 independent opinions exist (brief §7.2) — below that the
// page shows mentions and comments only, never a number.
//
// The claimed owner never sees this row (their opinion cannot
// count); the API enforces the same rule, so the hide is only
// presentation.

import { useState } from 'react'
import Link from 'next/link'

const MIN_OPINIONS = 5

export function ItemRecommendButton({
  itemId,
  initialRecommends,
  initialTotal,
  initialMine,
  currentUserId,
  isOwner,
  feedbackAvailable,
}: {
  itemId: string
  initialRecommends: number
  initialTotal: number
  initialMine: boolean | null
  currentUserId?: string | null
  isOwner: boolean
  feedbackAvailable: boolean
}) {
  const [mine, setMine] = useState<boolean | null>(initialMine)
  const [recommends, setRecommends] = useState(initialRecommends)
  const [total, setTotal] = useState(initialTotal)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!feedbackAvailable) {
    return (
      <p className="text-xs text-gray-400 mt-4">
        Las recomendaciones aún no están activadas — falta aplicar la migración 059.
      </p>
    )
  }

  // The claimed owner cannot opine on their own offerings.
  if (isOwner) return null

  const post = async (value: boolean | null) => {
    if (busy) return
    setBusy(true)
    setError('')
    // Optimistic: apply locally, revert on error.
    const prevMine = mine
    const prevRecommends = recommends
    const prevTotal = total
    const nextMine = value
    let nextRecommends = recommends
    let nextTotal = total
    if (prevMine === true && value !== true) nextRecommends -= 1
    if (prevMine === false && value === true) nextRecommends += 1
    if (prevMine === null && value === true) nextRecommends += 1
    if (prevMine === null && value !== null) nextTotal += 1
    if (prevMine !== null && value === null) nextTotal -= 1
    setMine(nextMine)
    setRecommends(Math.max(nextRecommends, 0))
    setTotal(Math.max(nextTotal, 0))

    const res = await fetch(`/api/items/${itemId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommends: value }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setMine(prevMine)
      setRecommends(prevRecommends)
      setTotal(prevTotal)
      setError(
        typeof data?.error === 'string' && data.error
          ? data.error
          : 'No se pudo guardar tu opinión. Intenta de nuevo.',
      )
      return
    }
    if (data?.feedback) {
      setRecommends(data.feedback.recommends as number)
      setTotal(data.feedback.total as number)
      setMine(data.feedback.mine as boolean | null)
    }
  }

  const pill = (active: boolean) =>
    `rounded-full border px-4 h-8 text-xs font-medium transition-colors ${
      active
        ? 'bg-gray-900 border-gray-900 text-white'
        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900'
    }`

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-900">¿Lo recomendarías?</span>
        {currentUserId ? (
          <>
            <button
              type="button"
              onClick={() => post(mine === true ? null : true)}
              disabled={busy}
              aria-pressed={mine === true}
              className={pill(mine === true)}
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => post(mine === false ? null : false)}
              disabled={busy}
              aria-pressed={mine === false}
              className={pill(mine === false)}
            >
              No
            </button>
          </>
        ) : (
          <Link href="/login" className="text-sm font-medium text-gray-900 underline">
            Inicia sesión para opinar
          </Link>
        )}
        {total >= MIN_OPINIONS && (
          <span className="text-xs text-gray-500">
            Recomendado por {recommends} {recommends === 1 ? 'persona' : 'personas'}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
