/**
 * Title-card palette for photo-less news/event listings (migration 039).
 *
 * When a news or event post has no photo, the feed card and the detail
 * page render a designed title card instead of a photo: a solid
 * background in one of these curated colors with the title in big
 * white text — the pattern Facebook text posts use (an "ALERTA TECATE"
 * card with no photo still travels). The poster picks one color at
 * posting time; orange is the default.
 *
 * Rules:
 * - Curated set only — never a free color picker (a free picker gets
 *   messy fast: clashing colors, unreadable text).
 * - Every color is dark enough for white title text to stay readable
 *   at large bold sizes.
 * - The card is the one place color carries meaning on the site; the
 *   monochrome rule stands everywhere else.
 * - A missing/unknown value (pre-migration-039 rows, or a bad value)
 *   reads as orange.
 */

export const CARD_COLORS = [
  { id: 'orange', label: 'Naranja', hex: '#EA580C' },
  { id: 'black', label: 'Negro', hex: '#111827' },
  { id: 'red', label: 'Rojo', hex: '#DC2626' },
  { id: 'blue', label: 'Azul', hex: '#1D4ED8' },
  { id: 'green', label: 'Verde', hex: '#15803D' },
  { id: 'purple', label: 'Morado', hex: '#7E22CE' },
] as const

export type CardColorId = (typeof CARD_COLORS)[number]['id']

export type CardColor = (typeof CARD_COLORS)[number]

export const DEFAULT_CARD_COLOR: CardColorId = 'orange'

export function isCardColorId(value: unknown): value is CardColorId {
  return (
    typeof value === 'string' &&
    (CARD_COLORS as readonly { id: string }[]).some((c) => c.id === value)
  )
}

/** Resolve any stored value (or a missing one) to a palette entry. */
export function resolveCardColor(value: string | null | undefined): CardColor {
  return CARD_COLORS.find((c) => c.id === value) ?? CARD_COLORS[0]
}
