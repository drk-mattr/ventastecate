import type { StoryOverlay } from '@/lib/types/database'
import {
  OVERLAYS_MAX,
  OVERLAY_SCALE_MAX,
  OVERLAY_SCALE_MIN,
  OVERLAY_TEXT_MAX,
} from './overlay-geometry'

/**
 * Pure validation for story overlays (POST /api/stories).
 * Rebuilds each overlay with only known fields, clamped into range —
 * anything malformed is rejected with a reason, never stored half-way.
 * Kept free of Next.js imports so it can be unit-tested with plain node.
 */
export function validateOverlays(
  input: unknown,
): { overlays: StoryOverlay[] } | { error: string } {
  if (input === undefined || input === null) return { overlays: [] }
  if (!Array.isArray(input)) return { error: 'Las capas de texto no son válidas' }
  if (input.length > OVERLAYS_MAX) {
    return { error: `Máximo ${OVERLAYS_MAX} textos por historia` }
  }
  const overlays: StoryOverlay[] = []
  for (const [i, raw] of input.entries()) {
    if (!raw || typeof raw !== 'object') {
      return { error: `La capa ${i + 1} no es válida` }
    }
    const o = raw as Record<string, unknown>
    if (o.kind !== 'text') return { error: `La capa ${i + 1} no es válida` }
    const text = typeof o.text === 'string' ? o.text.trim() : ''
    if (!text || text.length > OVERLAY_TEXT_MAX) {
      return { error: `El texto ${i + 1} debe tener entre 1 y ${OVERLAY_TEXT_MAX} caracteres` }
    }
    const num = (v: unknown, fallback: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? v : fallback
    const x = num(o.x, 0.5)
    const y = num(o.y, 0.5)
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return { error: `La posición de la capa ${i + 1} no es válida` }
    }
    const scale = Math.min(
      OVERLAY_SCALE_MAX,
      Math.max(OVERLAY_SCALE_MIN, num(o.scale, 1)),
    )
    let rotation = num(o.rotation, 0)
    rotation = Math.min(180, Math.max(-180, rotation))
    const id =
      typeof o.id === 'string' && o.id.trim()
        ? o.id.trim().slice(0, 32)
        : `o${i + 1}`
    overlays.push({ id, kind: 'text', text, x, y, scale, rotation })
  }
  return { overlays }
}
