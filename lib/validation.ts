/**
 * Shared zod schemas for user-supplied input. Used on the client (listing
 * create/edit, messaging) for fast feedback and on the server (API routes) as
 * the authoritative gate. DB CHECK constraints remain the last line of defense.
 */
import { z } from 'zod'

// ── Listings ────────────────────────────────────────────────────────────────

export const LISTING_TITLE_MAX = 120
export const LISTING_DESC_MAX = 5000
// Photos per listing — the Facebook / OfferUp standard. Client-side
// compression (lib/images/compress.ts) keeps 10 affordable on slow
// connections. Single source of truth: the new form, the edit form and
// the internal community-post route all read this constant.
export const MAX_LISTING_IMAGES = 10

export const listingInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(LISTING_TITLE_MAX, `El título no puede exceder ${LISTING_TITLE_MAX} caracteres`),
  description: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria')
    .max(LISTING_DESC_MAX, `La descripción no puede exceder ${LISTING_DESC_MAX} caracteres`),
  // News posts are free; everything else must be a finite, non-negative price.
  price: z
    .number()
    .finite('Precio inválido')
    .min(0, 'El precio no puede ser negativo')
    .max(1_000_000_000, 'Precio fuera de rango'),
  videoUrl: z
    .string()
    .trim()
    .url('El enlace de video no es válido')
    .max(500)
    .optional()
    .or(z.literal('')),
})

export type ListingInput = z.infer<typeof listingInputSchema>

/** Validate listing fields; returns the first error message, or null if valid. */
export function firstListingError(input: {
  title: string
  description: string
  price: number
  videoUrl?: string
}): string | null {
  const result = listingInputSchema.safeParse(input)
  if (result.success) return null
  return result.error.issues[0]?.message ?? 'Datos inválidos'
}

// ── Messaging ───────────────────────────────────────────────────────────────

export const MESSAGE_MAX = 2000

export const messageContentSchema = z
  .string()
  .trim()
  .min(1, 'El mensaje no puede estar vacío')
  .max(MESSAGE_MAX, `El mensaje no puede exceder ${MESSAGE_MAX} caracteres`)

// Messaging v2 Step 4 — safety actions. Report reasons are the
// suffix of the stored report type (`message_<reason>`); the block
// and archive payloads are validated server-side in their routes.
export const MESSAGE_REPORT_REASONS = [
  'spam',
  'harassment',
  'scam',
  'offensive',
  'other',
] as const

export const messageReportSchema = z.object({
  reason: z.enum(MESSAGE_REPORT_REASONS),
  description: z.string().trim().max(1000).optional().nullable(),
})

export const messageBlockSchema = z.object({
  userId: z.string().uuid(),
})

export const messageArchiveSchema = z.object({
  archived: z.boolean(),
})

// ── API payloads (server-side) ──────────────────────────────────────────────

export const reportSchema = z.object({
  type: z.string().trim().min(1).max(50),
  description: z.string().trim().max(2000).optional().nullable(),
  email: z.string().trim().max(120).optional().nullable(),
  listingId: z.string().uuid().optional().nullable(),
  listingTitle: z.string().trim().max(200).optional().nullable(),
})

export const discordNotifySchema = z.object({
  username: z.string().trim().min(1).max(60),
  displayName: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().max(120).optional().nullable(),
})
