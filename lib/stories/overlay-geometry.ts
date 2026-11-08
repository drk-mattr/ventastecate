import type { CSSProperties } from 'react'
import type { StoryOverlay } from '@/lib/types/database'

/**
 * Overlay geometry — shared by the story composer and the viewer so
 * placed text can never drift apart between editing and viewing.
 *
 * Both render the photo `object-contain`, so a landscape (or any
 * non-9:16) photo is letterboxed: the displayed photo is smaller
 * than its container and centered in it. Overlay x/y are fractions
 * (0–1) of the DISPLAYED photo, center-anchored — never of the
 * container — or text would land in the black bars.
 */

export type ImageRect = {
  x: number
  y: number
  width: number
  height: number
}

/** The rect the photo actually occupies inside its container. */
export function displayedImageRect(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): ImageRect {
  if (!containerWidth || !containerHeight || !naturalWidth || !naturalHeight) {
    return { x: 0, y: 0, width: containerWidth, height: containerHeight }
  }
  const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight)
  const width = naturalWidth * scale
  const height = naturalHeight * scale
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  }
}

/** Base font size (px) before the overlay's scale multiplier. */
export function overlayBaseFontSize(overlay: StoryOverlay): number {
  return isEmojiOnly(overlay.text) ? 44 : 28
}

/** True when the text is only emoji (no letters, digits, or spaces):
 * emoji overlays render bare and big, text overlays get a dark scrim. */
export function isEmojiOnly(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return /^[\p{Extended_Pictographic}\u200d\ufe0f]+$/u.test(trimmed)
}

/**
 * Estimated on-screen size (px) of an overlay at its own scale, before
 * rotation. Emoji is one square glyph; text is a single line, width
 * estimated from character count (~0.55em per glyph) plus the pill
 * padding. Deliberately conservative: the clamp only needs to keep the
 * glyph's bulk inside the photo, not measure it to the pixel.
 */
export function overlayBoxSize(overlay: StoryOverlay): {
  width: number
  height: number
} {
  // The rendered glyph is base size TIMES the overlay's scale (the
  // scale lives on the wrapper's transform, so it must be counted
  // here or a pinched-up emoji would still hang off the edge).
  const fontSize = overlayBaseFontSize(overlay) * overlay.scale
  if (isEmojiOnly(overlay.text)) {
    return { width: fontSize, height: fontSize }
  }
  return {
    width: Math.max(fontSize, overlay.text.length * fontSize * 0.55) + 32,
    height: fontSize * 1.3,
  }
}

/**
 * Clamp an overlay's center (fraction of the displayed photo) so its
 * whole box stays inside the displayed photo rect — never drifting into
 * the letterbox bars or half-cut off the bottom edge. Rotation is
 * ignored: the estimate is axis-aligned, which is enough to keep the
 * bulk on-canvas. If the box is wider/taller than the photo itself,
 * center it instead of producing an inverted range.
 */
export function clampOverlayCenter(
  overlay: StoryOverlay,
  rect: ImageRect,
): { x: number; y: number } {
  const size = overlayBoxSize(overlay)
  const halfW = size.width / 2 / rect.width
  const halfH = size.height / 2 / rect.height
  const x =
    halfW >= 0.5 ? 0.5 : Math.min(Math.max(overlay.x, halfW), 1 - halfW)
  const y =
    halfH >= 0.5 ? 0.5 : Math.min(Math.max(overlay.y, halfH), 1 - halfH)
  return { x, y }
}

/** Absolute-position style for one overlay inside its image rect. */
export function overlayStyle(overlay: StoryOverlay, rect: ImageRect): CSSProperties {
  return {
    position: 'absolute',
    left: rect.x + overlay.x * rect.width,
    top: rect.y + overlay.y * rect.height,
    transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg) scale(${overlay.scale})`,
    fontSize: overlayBaseFontSize(overlay),
  }
}

export const OVERLAY_TEXT_MAX = 60
export const OVERLAYS_MAX = 5
export const OVERLAY_SCALE_MIN = 0.5
export const OVERLAY_SCALE_MAX = 3
