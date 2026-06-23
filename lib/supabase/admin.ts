import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase admin client using the SERVICE-ROLE key.
 *
 * ⚠️ NEVER import this into a client component or expose the key — it bypasses
 * Row-Level Security and can read private auth data (e.g. user emails). Use it
 * only inside API routes / server code, and only for operations that genuinely
 * need elevated access.
 *
 * Returns null if the key isn't configured, so callers can degrade gracefully
 * instead of crashing.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
