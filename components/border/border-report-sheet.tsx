'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { useAuthModal } from '@/lib/auth/auth-modal-context'
import type { BorderDirection, BorderLane, BorderReportStatus } from '@/lib/border/estimate'

// 3-tap report sheet for La Garita (proposal §2): lane ->
// direction -> time chips + "¿Ya cruzaste o sigues en la
// fila?". Under 10 seconds, signed-in only. Only the three lanes
// that exist at Tecate — SENTRI / Ready Lane are never offered.
//
// Time chips store the midpoint of their range (30–60 -> 45);
// the exact-minutes field overrides the chip for people who
// know their wait. A chip is a range the reporter picks, not a
// precise number — the midpoint is the honest single value.

const LANES: { id: BorderLane; label: string }[] = [
  { id: 'auto', label: 'Auto general' },
  { id: 'peatonal', label: 'A pie' },
  { id: 'comercial', label: 'Camiones' },
]

const TIME_CHIPS: { label: string; minutes: number }[] = [
  { label: '0–15 min', minutes: 8 },
  { label: '15–30 min', minutes: 22 },
  { label: '30–60 min', minutes: 45 },
  { label: '60–90 min', minutes: 75 },
  { label: '90–120 min', minutes: 105 },
  { label: 'Más de 2 h', minutes: 135 },
]

export function BorderReportSheet() {
  const { user } = useAuth()
  const { openAuth } = useAuthModal()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [lane, setLane] = useState<BorderLane | null>(null)
  const [direction, setDirection] = useState<BorderDirection>('norte')
  const [minutes, setMinutes] = useState<number | null>(null)
  const [exactMinutes, setExactMinutes] = useState('')
  const [status, setStatus] = useState<BorderReportStatus | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const effectiveMinutes =
    exactMinutes.trim() !== '' ? Number(exactMinutes) : minutes
  const canSubmit =
    lane !== null &&
    status !== null &&
    effectiveMinutes !== null &&
    Number.isFinite(effectiveMinutes) &&
    effectiveMinutes >= 0 &&
    effectiveMinutes <= 360 &&
    !saving

  const openSheet = () => {
    if (!user) {
      openAuth('login')
      return
    }
    setError('')
    setOpen(true)
  }

  const close = () => {
    if (saving) return
    setOpen(false)
  }

  const submit = async () => {
    if (!canSubmit || lane === null || status === null || effectiveMinutes === null) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/border/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lane,
          direction,
          wait_minutes: Math.round(effectiveMinutes),
          status,
          note: note.trim() || undefined,
        }),
      })
      const data: { error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar el reporte')
        setSaving(false)
        return
      }
      setOpen(false)
      setLane(null)
      setMinutes(null)
      setExactMinutes('')
      setStatus(null)
      setNote('')
      router.refresh()
    } catch {
      setError('No se pudo guardar el reporte')
    }
    setSaving(false)
  }

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? 'border-gray-900 bg-gray-900 text-white'
        : 'border-gray-300 bg-white text-gray-900 hover:border-gray-900'
    }`

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="w-full rounded-full bg-gray-900 px-4 py-3 text-[15px] font-semibold text-white hover:bg-black"
      >
        Reportar la fila
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Reportar la fila"
            className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl max-h-[85svh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Reportar la fila</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar"
                className="p-1 text-gray-500 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Tres toques, menos de 10 segundos. Tu reporte cuenta por 60 minutos.
            </p>

            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
              Carril
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLane(l.id)}
                  className={chipClass(lane === l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
              Sentido
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDirection('norte')}
                className={chipClass(direction === 'norte')}
              >
                A EUA
              </button>
              <button
                type="button"
                onClick={() => setDirection('sur')}
                className={chipClass(direction === 'sur')}
              >
                A México
              </button>
            </div>
            {direction === 'sur' && (
              <p className="mt-2 text-xs text-gray-500">
                Para entrar a México no hay dato oficial — solo reportes de la comunidad.
              </p>
            )}

            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
              ¿Cuánto esperaste?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIME_CHIPS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    setMinutes(c.minutes)
                    setExactMinutes('')
                  }}
                  className={chipClass(minutes === c.minutes && exactMinutes === '')}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-xs text-gray-500">
              Minutos exactos (opcional)
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={360}
                value={exactMinutes}
                onChange={(e) => setExactMinutes(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                placeholder="Ej. 47"
                className="mt-1 block w-32 rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900"
              />
            </label>

            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
              ¿Ya cruzaste o sigues en la fila?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatus('ya_cruce')}
                className={chipClass(status === 'ya_cruce')}
              >
                Ya crucé
              </button>
              <button
                type="button"
                onClick={() => setStatus('en_fila')}
                className={chipClass(status === 'en_fila')}
              >
                Estoy en la fila
              </button>
            </div>
            {status === 'en_fila' && (
              <p className="mt-2 text-xs text-gray-500">
                Es el tiempo que llevas esperando hasta ahora — un mínimo, no el total.
              </p>
            )}

            <label className="mt-5 block text-xs text-gray-500">
              Nota (opcional, 280 caracteres)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 280))}
                rows={2}
                placeholder="Ej. La fila llega hasta la glorieta"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900"
              />
            </label>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="mt-5 w-full rounded-full bg-gray-900 px-4 py-3 text-[15px] font-semibold text-white hover:bg-black disabled:opacity-40"
            >
              {saving ? 'Guardando…' : 'Enviar reporte'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
