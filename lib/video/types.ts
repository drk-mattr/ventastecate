// Local video/reporter types.
//
// lib/types/database.ts is being edited concurrently by the La
// Garita build (migration 049), so the video columns (migration
// 050) are NOT added there yet — follow-up: move these fields into
// `Listing` / `Profile` in database.ts once the Garita PR merges,
// and delete this module's duplicates. Until then, every video
// read goes through these helpers so no component touches a column
// the shared types do not know about.
//
// The feed/detail queries select `*,` so the columns arrive on the
// row once 050 is applied; pre-050 every field is undefined and
// all of this fails soft — the video simply does not render.

export type ListingVideoFields = {
  video_storage_path?: string | null
  video_duration_seconds?: number | null
  video_thumbnail_url?: string | null
}

export type ReporterFields = {
  is_local_reporter?: boolean | null
}

export type NativeVideo = {
  /** Storage path inside the `listing-videos` bucket. */
  path: string
  durationSeconds: number | null
  thumbnailUrl: string | null
}

export function nativeVideoOf(listing: unknown): NativeVideo | null {
  if (!listing || typeof listing !== 'object') return null
  const row = listing as ListingVideoFields
  const path = row.video_storage_path
  if (!path) return null
  return {
    path,
    durationSeconds:
      typeof row.video_duration_seconds === 'number' ? row.video_duration_seconds : null,
    thumbnailUrl: row.video_thumbnail_url ?? null,
  }
}

export function isLocalReporter(profile: unknown): boolean {
  if (!profile || typeof profile !== 'object') return false
  return (profile as ReporterFields).is_local_reporter === true
}

/** Public URL for a storage path — URL construction only, no fetch. */
export function listingVideoPublicUrl(supabaseUrl: string, storagePath: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/listing-videos/${storagePath}`
}
