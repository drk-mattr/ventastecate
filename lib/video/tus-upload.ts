// Resumable (TUS) video upload to Supabase Storage.
//
// The installed supabase-js 2.97.0 does NOT expose a resumable
// upload API — its `.upload()` is a single shot that restarts a
// dropped file from zero. The Storage server DOES speak TUS
// (verified live 2026-11-09: a 40 MB upload survived a simulated
// drop and resumed to completion), so this module drives the TUS
// endpoint directly with tus-js-client, per the Supabase docs:
// endpoint `${SUPABASE_URL}/storage/v1/upload/resumable`, metadata
// bucketName / objectName / contentType / cacheControl, 6 MB chunks,
// retry delays. If this ever stops working, the honest fallback is
// the plain upload with the cap cut to ~20 MB — do not silently
// ship a restart-from-zero 50 MB upload.

import { Upload } from 'tus-js-client'
import type { SupabaseClient } from '@supabase/supabase-js'

const TUS_CHUNK_SIZE = 6 * 1024 * 1024

export type TusUploadProgress = { loaded: number; total: number }

export function getStorageUploadAuth(supabase: SupabaseClient) {
  // createBrowserClient stores the public URL + anon key on the
  // client instance; the user's session token is the Bearer auth.
  const client = supabase as unknown as { supabaseUrl?: string; supabaseKey?: string }
  return { url: client.supabaseUrl ?? '', anonKey: client.supabaseKey ?? '' }
}

export async function uploadVideoResumable(args: {
  supabase: SupabaseClient
  /** Storage path inside the bucket, e.g. `<user-id>/<listing-id>/123.mp4`. */
  objectPath: string
  file: File
  contentType: string
  onProgress?: (p: TusUploadProgress) => void
}): Promise<void> {
  const { supabase, objectPath, file, contentType, onProgress } = args
  const { url, anonKey } = getStorageUploadAuth(supabase)
  if (!url || !anonKey) throw new Error('Supabase client sin URL o clave pública')
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const accessToken = session?.access_token
  if (!accessToken) throw new Error('Sesión no encontrada para subir el video')

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `${url}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'listing-videos',
        objectName: objectPath,
        contentType,
        cacheControl: '3600',
      },
      chunkSize: TUS_CHUNK_SIZE,
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) => {
        onProgress?.({ loaded: bytesUploaded, total: bytesTotal })
      },
      onSuccess: () => resolve(),
    })
    // A previous attempt for the same file resumes from its stored
    // offset instead of starting over; a fresh file starts at 0.
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0])
      }
      upload.start()
    })
  })
}
