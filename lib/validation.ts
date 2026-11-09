/**
 * Shared zod schemas for user-supplied input. Used on the client (listing
 * create/edit, messaging) for fast feedback and on the server (API routes) as
 * the authoritative gate. DB CHECK constraints remain the last line of defense.
 */
import { z } from 'zod'
import type { ListingType } from '@/lib/types/database'
import { VIDEO_MAX_SECONDS, VIDEO_MAX_BYTES } from '@/lib/video/validate'

// ── Native video (migration 050) ────────────────────────────────────────────
// One native clip per news post: <=60s, <=50MB, MP4/MOV/WebM, in the
// `listing-videos` bucket via the TUS resumable path. The caps live
// in lib/video/validate.ts (size/MIME/duration are checked against
// the File there); this schema enforces the form-level rules: one
// video per post (upload XOR link) and the "Lo grabé yo mismo"
// declaration for uploads.
export { VIDEO_MAX_SECONDS, VIDEO_MAX_BYTES }

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
  // B2: the description is required only for news. For product /
  // service / event it is optional — a listing can publish with an
  // empty description (the DB column is NOT NULL, so the forms insert
  // '' rather than null). An unknown or missing type stays strict:
  // description required, so no caller silently loosens the rule.
  description: z
    .string()
    .trim()
    .max(LISTING_DESC_MAX, `La descripción no puede exceder ${LISTING_DESC_MAX} caracteres`),
  listingType: z.enum(['product', 'service', 'event', 'news']).optional(),
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
  // Native video upload (migration 050): set when the poster picked
  // a clip file. The file itself is checked in lib/video/validate.ts;
  // the schema only gates the declaration + the XOR with the link.
  hasVideoUpload: z.boolean().optional(),
  selfFilmed: z.boolean().optional(),
}).superRefine((data, ctx) => {
  const descOptional =
    data.listingType === 'product' || data.listingType === 'service' || data.listingType === 'event'
  if (!descOptional && !data.description.trim()) {
    ctx.addIssue({ code: 'custom', path: ['description'], message: 'La descripción es obligatoria' })
  }
  // One video per post: an upload OR a link, never both.
  if (data.hasVideoUpload && data.videoUrl?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['videoUrl'], message: 'Elige un video o pega un enlace, no los dos' })
  }
  // "Lo grabé yo mismo" is a declaration, not a proof — but it
  // changes the poster's stance and gives the moderator a clear
  // line on fake/staged clips. Required for uploads.
  if (data.hasVideoUpload && !data.selfFilmed) {
    ctx.addIssue({ code: 'custom', path: ['selfFilmed'], message: 'Confirma que grabaste este video' })
  }
})

export type ListingInput = z.infer<typeof listingInputSchema>

/** Validate listing fields; returns the first error message, or null if valid. */
export function firstListingError(input: {
  title: string
  description: string
  price: number
  videoUrl?: string
  listingType?: ListingType
  hasVideoUpload?: boolean
  selfFilmed?: boolean
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
