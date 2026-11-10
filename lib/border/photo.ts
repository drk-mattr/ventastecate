// La Garita feed (migration 051) — border photo validation + paths.
//
// Pure functions only (no Next / Supabase imports) so they are
// unit-testable: the report route calls them, the tests import
// them. A photo is validated by its FILE SIGNATURE, never the
// extension or the declared MIME — same sniff as the internal
// listing-image route. One photo per post, <= 5 MB after
// compression. Photos live in the public `listing-images` bucket
// under border/<userId>/<reportId>.<ext>: one object per post, so
// a 15-minute replace overwrites the same path (upsert).

export const BORDER_PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const BORDER_PHOTO_BUCKET = 'listing-images'

export type BorderPhotoExt = 'jpg' | 'png' | 'webp'

/** Detect the image type from the file signature. */
export function sniffBorderPhoto(bytes: Buffer): {
  contentType: string
  ext: BorderPhotoExt
} | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { contentType: 'image/jpeg', ext: 'jpg' }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return { contentType: 'image/png', ext: 'png' }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  )
    return { contentType: 'image/webp', ext: 'webp' }
  return null
}

export type ParsedBorderPhoto =
  | { ok: true; bytes: Buffer; contentType: string; ext: BorderPhotoExt }
  | { ok: false; error: string }

/**
 * Parse a `data:image/...;base64,...` upload: shape, size cap,
 * then signature sniff (authoritative — a PNG mislabeled as
 * JPEG still uploads as PNG). Rejects non-images and > 5 MB.
 */
export function parseBorderPhotoDataUrl(image: unknown): ParsedBorderPhoto {
  if (typeof image !== 'string' || image.length === 0) {
    return { ok: false, error: 'Se requiere una imagen (JPEG, PNG o WebP)' }
  }
  const match = image.match(/^data:image\/[a-z]+;base64,([A-Za-z0-9+/=]+)$/)
  if (!match) {
    return { ok: false, error: 'Se requiere una imagen (JPEG, PNG o WebP)' }
  }
  const bytes = Buffer.from(match[1], 'base64')
  if (bytes.length === 0) {
    return { ok: false, error: 'Se requiere una imagen (JPEG, PNG o WebP)' }
  }
  if (bytes.length > BORDER_PHOTO_MAX_BYTES) {
    return { ok: false, error: 'La imagen es demasiado grande (máximo 5 MB)' }
  }
  const sniffed = sniffBorderPhoto(bytes)
  if (!sniffed) {
    return { ok: false, error: 'Solo se aceptan imágenes JPEG, PNG o WebP' }
  }
  return { ok: true, bytes, contentType: sniffed.contentType, ext: sniffed.ext }
}

/** Storage path for one post's photo. */
export function borderPhotoPath(
  userId: string,
  reportId: string,
  ext: BorderPhotoExt,
): string {
  return `border/${userId}/${reportId}.${ext}`
}

/**
 * Storage path behind a public listing-images URL, or null when
 * the URL is not a border photo in this bucket (e.g. an older
 * already-hosted photo_url). Used to clean up the previous
 * object when a replace lands at a different path — or at no
 * path at all.
 */
export function borderPhotoPathFromPublicUrl(publicUrl: string | null): string | null {
  if (!publicUrl) return null
  const marker = `/storage/v1/object/public/${BORDER_PHOTO_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return null
  const path = publicUrl.slice(idx + marker.length).split(/[?#]/)[0]
  if (!path.startsWith('border/')) return null
  return path
}
