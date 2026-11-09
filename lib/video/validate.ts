// Video validation + poster capture for native news video (v1).
// Caps are the cost control (proposal 2026-11-09 §3a): 1 clip per
// news post, <=60s, <=50MB, MP4/MOV/WebM. The 50 MB cap sits exactly
// at the Free-tier per-file ceiling (plan verified Free 2026-11-09).
// No transcoding in v1 — the phone already records H.264/HEVC the
// browser plays natively; the original ships, capped.

export const VIDEO_MAX_SECONDS = 60
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const
export const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'] as const
/** Per-user daily cap on video posts (proposal §4): a spam flood
 * cannot be 50 videos before anyone notices. Enforced in the
 * submit path; text posts keep today's behavior. */
export const VIDEO_MAX_PER_DAY = 5

export function formatVideoDuration(totalSeconds: number | null | undefined): string | null {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return null
  const s = Math.round(totalSeconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function formatVideoSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

function fileExtension(file: File): string {
  return (file.name.split('.').pop() || '').toLowerCase()
}

function mimeAllowed(file: File): boolean {
  if ((VIDEO_MIME_TYPES as readonly string[]).includes(file.type)) return true
  // Some browsers report an empty or generic MIME for a valid clip —
  // the extension is the backstop, never a bypass on its own: a
  // non-video MIME with a video extension is still rejected.
  if (!file.type || file.type === 'application/octet-stream') {
    return (VIDEO_EXTENSIONS as readonly string[]).includes(fileExtension(file))
  }
  return false
}

export type VideoCheck =
  | { ok: true; durationSeconds: number }
  | { ok: false; error: string }

/**
 * Read a video file's metadata (duration) without uploading it.
 * Rejects on size / MIME / duration. A duration the browser cannot
 * read is a rejection, not a pass: if this browser cannot play the
 * clip, the player cannot either.
 */
export async function validateVideoFile(file: File): Promise<VideoCheck> {
  if (!mimeAllowed(file)) {
    return { ok: false, error: 'El video debe ser MP4, MOV o WebM' }
  }
  if (file.size > VIDEO_MAX_BYTES) {
    return { ok: false, error: `El video no puede pasar de 50 MB (${formatVideoSize(file.size)})` }
  }
  const url = URL.createObjectURL(file)
  try {
    const durationSeconds = await new Promise<number>((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      const cleanup = () => {
        video.removeAttribute('src')
        video.load()
      }
      video.onloadedmetadata = () => {
        const d = video.duration
        cleanup()
        if (!Number.isFinite(d)) reject(new Error('duration'))
        else resolve(d)
      }
      video.onerror = () => {
        cleanup()
        reject(new Error('load'))
      }
      video.src = url
    })
    if (durationSeconds > VIDEO_MAX_SECONDS) {
      return { ok: false, error: `El video no puede durar más de 60 segundos (${Math.round(durationSeconds)}s)` }
    }
    return { ok: true, durationSeconds }
  } catch {
    return { ok: false, error: 'No se pudo leer este video. Prueba con otro archivo.' }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Capture a poster frame from the clip (~1s in, or the first frame
 * for shorter clips) as a JPEG blob, for the feed card thumbnail
 * and the moderator inbox. Same canvas pattern as image compression
 * (lib/images/compress.ts). Returns null when the frame cannot be
 * captured — the upload proceeds without a poster, never blocked.
 */
export async function captureVideoPoster(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file)
  try {
    const blob = await new Promise<Blob | null>((resolve) => {
      const video = document.createElement('video')
      video.preload = 'auto'
      video.muted = true
      video.playsInline = true
      const cleanup = () => {
        video.removeAttribute('src')
        video.load()
      }
      const fail = () => {
        cleanup()
        resolve(null)
      }
      video.onloadedmetadata = () => {
        const seekTo = Math.min(1, Math.max(0, (video.duration || 0) - 0.1))
        video.currentTime = seekTo > 0 ? seekTo : 0
      }
      video.onseeked = () => {
        try {
          if (!video.videoWidth || !video.videoHeight) return fail()
          const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight))
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
          const ctx = canvas.getContext('2d')
          if (!ctx) return fail()
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          cleanup()
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8)
        } catch {
          fail()
        }
      }
      video.onerror = fail
      // A clip that never loads metadata must not hang the publish.
      setTimeout(() => {
        if (video.readyState < 2) fail()
      }, 8000)
      video.src = url
    })
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}
