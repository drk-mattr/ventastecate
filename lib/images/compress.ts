// Client-side image compression for the posting flow (P0-2).
// A modern phone photo is 3-8 MB; five of them is up to ~40 MB over a
// slow Tecate mobile connection. Compress to max 1600px on the long
// edge, JPEG quality 0.8, before upload. Any failure returns the
// original file — compression must never block posting.
export const COMPRESSED_MAX_DIMENSION = 1600
export const COMPRESSED_JPEG_QUALITY = 0.8
// Files already small enough skip the canvas round-trip entirely.
const SMALL_ENOUGH_BYTES = 500 * 1024

export async function compressImage(file: File): Promise<File> {
  try {
    if (!file.type.startsWith('image/')) return file
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    const scale = Math.min(1, COMPRESSED_MAX_DIMENSION / Math.max(width, height))
    if (scale === 1 && file.size <= SMALL_ENOUGH_BYTES) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', COMPRESSED_JPEG_QUALITY),
    )
    if (!blob) return file
    const base = file.name.replace(/\.[^.]*$/, '') || 'foto'
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    // HEIC / unsupported decode / any canvas failure: post the original.
    return file
  }
}
