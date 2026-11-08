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
