'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Type, Trash2, X } from 'lucide-react'
import type { StoryOverlay } from '@/lib/types/database'
import {
  displayedImageRect,
  isEmojiOnly,
  overlayBaseFontSize,
  overlayStyle,
  OVERLAYS_MAX,
  OVERLAY_TEXT_MAX,
  type ImageRect,
} from '@/lib/stories/overlay-geometry'

// Small emoji row: tapping one drops it as a large overlay, same
// gestures as text (emojis are just text — no separate engine).
const EMOJI_ROW = ['😀', '😂', '❤️', '🔥', '👏', '🎉', '🌮', '☕', '👍', '😍']

function newOverlayId(): string {
  return `o${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
}

interface StoryComposerProps {
  dataUrl: string
  filename: string
  onClose: () => void
  onPublished: () => void
}

type Gesture =
  | {
      mode: 'drag'
      overlayId: string
      startX: number
      startY: number
      startOverlayX: number
      startOverlayY: number
      moved: boolean
      wasSelected: boolean
    }
  | {
      mode: 'pinch'
      overlayId: string
      startDist: number
      startAngle: number
      startScale: number
      startRotation: number
    }

/**
 * Full-screen story composer (P0+P1): the photo IS the screen, above
 * the bottom nav (z-[60]), with text as placeable overlays on it.
 * Tap Aa to type (or pick an emoji), Done drops it at the center.
 * One finger drags to move, two fingers pinch to scale and twist to
 * rotate, drag to the trash zone to delete. Nothing publishes until
 * Publicar. Hand-rolled Pointer Events — no gesture library.
 */
export function StoryComposer({ dataUrl, filename, onClose, onPublished }: StoryComposerProps) {
  const [overlays, setOverlays] = useState<StoryOverlay[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [trashHot, setTrashHot] = useState(false)
  // A drag gesture is active (state, not just a ref — the trash zone
  // only renders when this changes).
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const trashRef = useRef<HTMLDivElement | null>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const gestureRef = useRef<Gesture | null>(null)
  const overlaysRef = useRef(overlays)
  overlaysRef.current = overlays

  const rect: ImageRect = useMemo(
    () =>
      displayedImageRect(
        size.w,
        size.h,
        natural?.w ?? 0,
        natural?.h ?? 0,
      ),
    [size, natural],
  )

  // Measure the canvas on mount + window resize (event-driven, like
  // the viewer's interval effect — not derived state).
  useEffect(() => {
    const measure = () => {
      const el = canvasRef.current
      if (el) setSize({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Escape closes (the editor first, then the composer); lock body
  // scroll while the takeover is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (editingId) setEditingId(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [editingId, onClose])

  const updateOverlay = useCallback((id: string, patch: Partial<StoryOverlay>) => {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }, [])

  const startEditing = useCallback((id: string | null, initialText: string) => {
    setEditingId(id)
    setInputText(initialText)
  }, [])

  const finishEditing = useCallback(() => {
    const text = inputText.trim()
    if (editingId === 'new') {
      if (text) {
        const overlay: StoryOverlay = {
          id: newOverlayId(),
          kind: 'text',
          text,
          x: 0.5,
          y: 0.4,
          scale: 1,
          rotation: 0,
        }
        setOverlays((prev) => [...prev, overlay])
        setSelectedId(overlay.id)
      }
    } else if (editingId) {
      if (text) updateOverlay(editingId, { text })
      else setOverlays((prev) => prev.filter((o) => o.id !== editingId))
      setSelectedId(null)
    }
    setEditingId(null)
    setInputText('')
  }, [editingId, inputText, updateOverlay])

  const addEmoji = useCallback((emoji: string) => {
    if (overlaysRef.current.length >= OVERLAYS_MAX) {
      setError(`Máximo ${OVERLAYS_MAX} textos por historia`)
      return
    }
    const overlay: StoryOverlay = {
      id: newOverlayId(),
      kind: 'text',
      text: emoji,
      x: 0.5,
      y: 0.4,
      scale: 1.8,
      rotation: 0,
    }
    setOverlays((prev) => [...prev, overlay])
    setSelectedId(overlay.id)
    setError(null)
  }, [])

  const deleteOverlay = useCallback((id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }, [])

  // --- Pointer gestures (one container-level handler set) ---
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (uploading) return
    const target = (e.target as HTMLElement).closest('[data-overlay-id]')
    const overlayId = target?.getAttribute('data-overlay-id') ?? null
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    if (!overlayId) {
      // Background tap: deselect. A second finger landing anywhere
      // while a drag is active upgrades it to a pinch.
      if (gestureRef.current?.mode === 'drag' && pointersRef.current.size === 2) {
        const [a, b] = [...pointersRef.current.values()]
        const g = gestureRef.current
        setDraggingId(null)
        gestureRef.current = {
          mode: 'pinch',
          overlayId: g.overlayId,
          startDist: Math.hypot(a.x - b.x, a.y - b.y),
          startAngle: Math.atan2(a.y - b.y, a.x - b.x),
          startScale: overlaysRef.current.find((o) => o.id === g.overlayId)?.scale ?? 1,
          startRotation:
            overlaysRef.current.find((o) => o.id === g.overlayId)?.rotation ?? 0,
        }
      } else if (pointersRef.current.size === 1) {
        setSelectedId(null)
      }
      return
    }
    const wasSelected = selectedId === overlayId
    setSelectedId(overlayId)
    const overlay = overlaysRef.current.find((o) => o.id === overlayId)
    if (!overlay) return
    if (pointersRef.current.size === 1) {
      gestureRef.current = {
        mode: 'drag',
        overlayId,
        startX: e.clientX,
        startY: e.clientY,
        startOverlayX: overlay.x,
        startOverlayY: overlay.y,
        moved: false,
        wasSelected,
      }
      setDraggingId(overlayId)
    } else if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      setDraggingId(null)
      gestureRef.current = {
        mode: 'pinch',
        overlayId,
        startDist: Math.hypot(a.x - b.x, a.y - b.y),
        startAngle: Math.atan2(a.y - b.y, a.x - b.x),
        startScale: overlay.scale,
        startRotation: overlay.rotation,
      }
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointersRef.current.get(e.pointerId)
    if (!p) return
    p.x = e.clientX
    p.y = e.clientY
    const g = gestureRef.current
    if (!g) return
    if (g.mode === 'drag' && pointersRef.current.size === 1) {
      const dx = e.clientX - g.startX
      const dy = e.clientY - g.startY
      if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true
      if (g.moved) {
        const nx = Math.min(0.98, Math.max(0.02, g.startOverlayX + dx / Math.max(1, rect.width)))
        const ny = Math.min(0.98, Math.max(0.02, g.startOverlayY + dy / Math.max(1, rect.height)))
        updateOverlay(g.overlayId, { x: nx, y: ny })
        // Trash zone: dragging over it arms the delete.
        const trash = trashRef.current?.getBoundingClientRect()
        setTrashHot(
          !!trash &&
            e.clientX >= trash.left &&
            e.clientX <= trash.right &&
            e.clientY >= trash.top &&
            e.clientY <= trash.bottom,
        )
      }
    } else if (g.mode === 'pinch' && pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const angle = Math.atan2(a.y - b.y, a.x - b.x)
      if (dist > 0 && g.startDist > 0) {
        const scale = Math.min(3, Math.max(0.5, g.startScale * (dist / g.startDist)))
        let rotation = g.startRotation + ((angle - g.startAngle) * 180) / Math.PI
        rotation = Math.min(180, Math.max(-180, rotation))
        updateOverlay(g.overlayId, { scale, rotation })
      }
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current
    pointersRef.current.delete(e.pointerId)
    if (g?.mode === 'drag') {
      // Tap (no real move) on an already-selected overlay = edit it.
      if (!g.moved && g.wasSelected) {
        const overlay = overlaysRef.current.find((o) => o.id === g.overlayId)
        if (overlay) startEditing(overlay.id, overlay.text)
      }
      // Drop on the trash zone deletes.
      if (g.moved && trashHot) deleteOverlay(g.overlayId)
    }
    if (pointersRef.current.size < 2) gestureRef.current = null
    setTrashHot(false)
    setDraggingId(null)
  }

  const publish = async () => {
    if (uploading) return
    setUploading(true)
    setError(null)
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          filename,
          overlays: overlays.length > 0 ? overlays : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || 'No se pudo publicar la historia')
        return
      }
      onPublished()
    } catch {
      setError('No se pudo publicar la historia')
    } finally {
      setUploading(false)
    }
  }

  const dragging = draggingId !== null

  return (
    <div
      className="fixed inset-0 z-[60] bg-black flex flex-col"
      role="dialog"
      aria-label="Crear historia"
      style={{ touchAction: 'none' }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 relative z-20">
        <button
          type="button"
          onClick={onClose}
          disabled={uploading}
          aria-label="Cancelar"
          className="h-10 w-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="flex-1 text-sm font-semibold text-white text-center">Tu historia</span>
        <button
          type="button"
          onClick={() => {
            if (overlays.length >= OVERLAYS_MAX) {
              setError(`Máximo ${OVERLAYS_MAX} textos por historia`)
              return
            }
            startEditing('new', '')
          }}
          disabled={uploading}
          aria-label="Agregar texto"
          className="h-10 w-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-50"
        >
          <Type className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={uploading}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 disabled:opacity-50"
        >
          {uploading ? 'Publicando…' : 'Publicar'}
        </button>
      </div>

      {/* Text editor (add / edit) */}
      {editingId !== null && (
        <div className="px-3 pb-2 relative z-20">
          <div className="flex gap-2">
            <input
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, OVERLAY_TEXT_MAX))}
              maxLength={OVERLAY_TEXT_MAX}
              placeholder="Escribe algo…"
              className="flex-1 min-w-0 rounded-full bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:bg-white/15"
            />
            <button
              type="button"
              onClick={finishEditing}
              className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-900"
            >
              Listo
            </button>
          </div>
          <p className="mt-1 text-right text-xs text-white/50">
            {inputText.length}/{OVERLAY_TEXT_MAX}
          </p>
        </div>
      )}

      {/* Canvas: the photo IS the screen */}
      <div
        ref={canvasRef}
        className="relative flex-1 min-h-0 select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Image
          src={dataUrl}
          alt="Vista previa de la historia"
          fill
          className="object-contain"
          sizes="100vw"
          priority
          onLoadingComplete={({ naturalWidth, naturalHeight }) =>
            setNatural({ w: naturalWidth, h: naturalHeight })
          }
        />
        {overlays.map((o) => {
          const emoji = isEmojiOnly(o.text)
          return (
            <div
              key={o.id}
              data-overlay-id={o.id}
              className={`absolute ${selectedId === o.id ? 'z-20 ring-2 ring-white/90 rounded-full' : 'z-10'}`}
              style={overlayStyle(o, rect)}
            >
              <span
                className={
                  emoji
                    ? 'block leading-none'
                    : 'block rounded-full bg-black/60 px-3 py-1 text-center font-semibold text-white whitespace-nowrap'
                }
                style={{ fontSize: overlayBaseFontSize(o) }}
              >
                {o.text}
              </span>
            </div>
          )
        })}
        {/* Safe-zone hint while editing */}
        {overlays.length === 0 && editingId === null && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-4">
            <p className="rounded-full bg-black/60 px-4 py-2 text-center text-xs text-white/80">
              Toca Aa para agregar texto · arrastra para moverlo · pellizca para cambiar su tamaño
            </p>
          </div>
        )}
      </div>

      {/* Bottom bar: emoji row + hint, or the trash zone while dragging */}
      <div className="relative z-20 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {dragging ? (
          <div
            ref={trashRef}
            className={`flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold ${
              trashHot ? 'bg-red-600 text-white' : 'bg-white/10 text-white'
            }`}
          >
            <Trash2 className="h-4 w-4" />
            Suelta para eliminar
          </div>
        ) : (
          <>
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {EMOJI_ROW.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  disabled={uploading}
                  aria-label={`Agregar ${emoji}`}
                  className="flex-none h-11 w-11 rounded-full bg-white/10 text-2xl flex items-center justify-center disabled:opacity-50"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <p className="mt-1 text-center text-[11px] text-white/50">
              Toca un texto para seleccionarlo · tócalo otra vez para editarlo
            </p>
          </>
        )}
        {error && <p className="mt-1 text-center text-xs text-red-400">{error}</p>}
      </div>
    </div>
  )
}
