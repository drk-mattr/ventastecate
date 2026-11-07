// Plain-Spanish error messages for the posting flow (P1-3).
// The submit path talks to Supabase directly from the browser, so any
// failure past client-side validation used to surface verbatim English
// Postgres/RLS/storage text. Map the common cases to Spanish with a
// next step; never show the raw message to the seller. The raw error
// is still logged to the console for debugging.
export function humanizePostError(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  const msg = raw.toLowerCase()
  if (!raw) return 'No se pudo publicar. Inténtalo de nuevo.'
  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed')
  ) {
    return 'Sin conexión. Revisa tu señal e inténtalo de nuevo.'
  }
  if (
    msg.includes('row-level security') ||
    msg.includes('not authorized') ||
    msg.includes('permission denied')
  ) {
    return 'No tienes permiso para publicar esto. Cierra sesión y entra de nuevo.'
  }
  if (msg.includes('duplicate key') || msg.includes('already exists')) {
    return 'Ya existe un anuncio igual. Revisa tus anuncios.'
  }
  if (msg.includes('storage') || msg.includes('upload') || msg.includes('bucket')) {
    return 'No se pudieron subir las fotos. Revisa tu conexión e inténtalo de nuevo.'
  }
  if (
    msg.includes('violates check') ||
    msg.includes('violates not-null') ||
    msg.includes('invalid input') ||
    msg.includes('violates foreign key')
  ) {
    return 'Hay un dato inválido en el anuncio. Revísalo e inténtalo de nuevo.'
  }
  if (msg.includes('jwt') || msg.includes('expired') || msg.includes('session')) {
    return 'Tu sesión expiró. Entra de nuevo e inténtalo otra vez.'
  }
  return 'No se pudo publicar. Inténtalo de nuevo.'
}
