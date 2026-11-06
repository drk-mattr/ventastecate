/**
 * Messaging v2 Step 4 — shared server helpers for the safety routes.
 *
 * Pre-031 guards live here: migration 031 is run by hand after
 * deploy, so the tables/columns it adds may not exist yet. A query
 * that fails because the object is missing must degrade (empty
 * blocks, unarchived) instead of 500ing the whole route.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** Postgres codes for "this table/column does not exist yet". */
export function isMissingObjectError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === '42703' || error.code === '42P01') return true
  return /archived_by_(buyer|seller)|user_blocks|conversation_id/.test(error.message ?? '')
}

/** Is this conversation row archived for the given participant? */
export function isArchivedByMe(
  row: { buyer_id: string; archived_by_buyer?: boolean | null; archived_by_seller?: boolean | null },
  userId: string
): boolean {
  const isBuyer = row.buyer_id === userId
  return isBuyer ? (row.archived_by_buyer ?? false) : (row.archived_by_seller ?? false)
}

/**
 * Ids the user has blocked. Empty set when the user_blocks table
 * does not exist yet (pre-031) or the lookup fails — blocking is
 * simply not in effect until the migration runs.
 */
export async function getBlockedIds(
  admin: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data, error } = await admin
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId)
  if (error || !data) return new Set()
  return new Set(data.map((r) => r.blocked_id as string))
}
