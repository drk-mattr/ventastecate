'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { compressImage } from '@/lib/images/compress'
import type { BorderDirection, BorderLane, BorderPace, BorderReportStatus, TailMarker } from '@/lib/border/estimate'
import { PACE_LABELS, TAIL_MARKER_LABELS } from '@/lib/border/estimate'

// 3-tap report dialog for La Garita (proposal §2): lane ->
// direction -> time chips + "¿Ya cruzaste o sigues en la
// fila?". Under 10 seconds, signed-in only. Only the three lanes
// that exist at Tecate — SENTRI / Ready Lane are never offered.
//
// The dialog is controlled (open / onClose) and mounts once in
// Header — the trigger lives in the nav Garita dropdown
// (desktop) and the sidebar row (mobile), not in this component.
// The guest guard (auth modal first) lives with the opener in
// Header, same as the old sheet's opener guard.
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

// Feed (migration 051): the dialog is the composer — the photo
// step comes last, after the note. One photo, compressed on the
// phone with the same helper as the posting form, preview +
// remove. No `capture` on the input (PR #99 lesson): iOS must
// offer the library, not force the camera.
export function BorderReportDialog({
  open,
  onClose,
  portOpen,
}: {
  open: boolean
  onClose: () => void
  portOpen: boolean
}) {
  const router = useRouter()
  const [lane, setLane] = useState<BorderLane | null>(null)
  const [direction, setDirection] = useState<BorderDirection>('norte')
  const [minutes, setMinutes] = useState<number | null>(null)
  const [exactMinutes, setExactMinutes] = useState('')
  const [status, setStatus] = useState<BorderReportStatus | null>(null)
  // Dynamics (migration 052): two optional one-tap picks, never
  // a gate — canSubmit is unchanged (lane + status + minutes
  // only). Pace is for every lane; the tail is auto + en_fila
  // only (different lines, different approaches).
  const [pace, setPace] = useState<BorderPace | null>(null)
  const [tailMarker, setTailMarker] = useState<TailMarker | null>(null)
  const [note, setNote] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Revoke the preview object URL when it is replaced or the
  // sheet unmounts, so a picked photo never leaks memory.
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    },
    [photoPreview],
  )

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

  const close = () => {
    if (saving) return
    onClose()
  }

  const onPhotoPick = async (file: File | undefined) => {
    setPhotoError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Elige una foto (JPEG, PNG o WebP)')
      return
    }
    const compressed = await compressImage(file)
    if (compressed.size > 5 * 1024 * 1024) {
      setPhotoError('La foto es demasiado grande (máximo 5 MB)')
      return
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(compressed)
    setPhotoPreview(URL.createObjectURL(compressed))
  }

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    setPhotoError('')
  }

  const submit = async () => {
    if (!canSubmit || lane === null || status === null || effectiveMinutes === null) return
    setSaving(true)
    setError('')
    try {
      let image: string | undefined
      if (photoFile) {
        image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('read'))
          reader.readAsDataURL(photoFile)
        })
      }
      const res = await fetch('/api/border/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lane,
          direction,
          wait_minutes: Math.round(effectiveMinutes),
          status,
          note: note.trim() || undefined,
          pace: pace ?? undefined,
          // The tail only counts for auto + en_fila — never
          // send a stale pick from a lane/status switch.
          tail_marker:
            lane === 'auto' && status === 'en_fila' ? (tailMarker ?? undefined) : undefined,
          image,
        }),
      })
      const data: { error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar el reporte')
        setSaving(false)
        return
      }
      onClose()
      setLane(null)
      setMinutes(null)
      setExactMinutes('')
      setStatus(null)
      setPace(null)
      setTailMarker(null)
      setNote('')
      removePhoto()
      router.refresh()
      // The header chip shows the same headline as the page —
      // tell it to refetch now, not at its next poll (audit
      // §1.5: a 5-minute-old chip after your own report is the
      // bug this fixes).
      window.dispatchEvent(new Event('border:updated'))
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

            {!portOpen ? (
              <p className="mt-5 text-sm text-gray-700">
                La garita está cerrada — vuelve a las 6 am. De noche no hay nada que
                reportar.
              </p>
            ) : (
              <>
            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
              Carril
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setLane(l.id)
                    if (l.id !== 'auto') setTailMarker(null)
                  }}
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
                onClick={() => {
                  setStatus('ya_cruce')
                  setTailMarker(null)
                }}
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

            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
              ¿Cómo va? (opcional)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(PACE_LABELS) as BorderPace[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPace(pace === p ? null : p)}
                  className={chipClass(pace === p)}
                >
                  {PACE_LABELS[p]}
                </button>
              ))}
            </div>

            {lane === 'auto' && status === 'en_fila' && (
              <>
                <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
                  ¿Hasta dónde llega la fila? (opcional)
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(TAIL_MARKER_LABELS) as TailMarker[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTailMarker(tailMarker === t ? null : t)}
                      className={chipClass(tailMarker === t)}
                    >
                      {TAIL_MARKER_LABELS[t]}
                    </button>
                  ))}
                </div>
              </>
            )}

            <label className="mt-5 block text-xs text-gray-500">
              Nota (opcional, 280 caracteres)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 280))}
                rows={2}
                placeholder="Ej. Hay revisión antes de la garita"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900"
              />
            </label>

            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
              Foto de la fila (opcional)
            </p>
            {photoPreview ? (
              <div className="relative mt-2">
                {/* Plain img: object URL, not a remote asset. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Foto de la fila"
                  className="aspect-[4/3] w-full rounded-lg object-cover bg-gray-100"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-700 hover:border-gray-900">
                Agregar foto de la fila
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void onPhotoPick(e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            )}
            {photoError && <p className="mt-2 text-sm text-red-600">{photoError}</p>}
            <p className="mt-2 text-xs text-gray-500">
              La foto es pública, como el resto de la página.
            </p>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="mt-5 w-full rounded-full bg-gray-900 px-4 py-3 text-[15px] font-semibold text-white hover:bg-black disabled:opacity-40"
            >
              {saving ? 'Guardando…' : 'Enviar reporte'}
            </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
