import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type EngagementCounts = {
  likes: number
  saves: number
  comments: number
}

/**
 * Count likes / saves / comments per listing from the per-action tables.
 *
 * listings.likes_count / saves_count / comments_count were added by
 * migration 005 but dropped by migration 016, and never existed on the
 * current prod DB — every read of those columns returns nothing (or
 * 400s when selected explicitly). So engagement must be counted here.
 *
 * Reads are open: all three tables have a "viewable by everyone"
 * SELECT policy (using (true)), so the anon SSR client sees every row.
 *
 * Embedded PostgREST counts (listing_likes(count)) are NOT an option:
 * the listing_likes → listings foreign key is declared in the repo but
 * missing from prod's schema cache (same lineage gap as the old
 * conversations FKs), so the embed 400s with PGRST200. Instead this
 * runs three bounded queries (one per table, listing_id only) and
 * tallies in JS — never N+1. Ids are chunked so a long `in.(...)`
 * filter never blows up the URL.
 */
const CHUNK_SIZE = 100

export async function getEngagementCounts(
  supabase: SupabaseServerClient,
  listingIds: string[],
): Promise<Map<string, EngagementCounts>> {
  const counts = new Map<string, EngagementCounts>()
  const ids = [...new Set(listingIds.filter(Boolean))]
  if (ids.length === 0) return counts

  const tally = (
    rows: Array<{ listing_id: string }> | null,
    key: keyof EngagementCounts,
  ) => {
    for (const row of rows ?? []) {
      const cur = counts.get(row.listing_id) ?? { likes: 0, saves: 0, comments: 0 }
      cur[key] += 1
      counts.set(row.listing_id, cur)
    }
  }

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE)
    const [likes, saves, comments] = await Promise.all([
      supabase.from('listing_likes').select('listing_id').in('listing_id', chunk),
      supabase.from('listing_saves').select('listing_id').in('listing_id', chunk),
      supabase.from('listing_comments').select('listing_id').in('listing_id', chunk),
    ])
    tally(likes.data, 'likes')
    tally(saves.data, 'saves')
    tally(comments.data, 'comments')
  }

  return counts
}

/**
 * Attach real counts onto listing rows as likes_count / saves_count /
 * comments_count — the shape ListingWithImages already promises, so
 * feed cards, the trending strip and the engagement bar need no change.
 */
export function attachEngagementCounts<T extends { id: string }>(
  listings: T[],
  counts: Map<string, EngagementCounts>,
): Array<
  T & { likes_count: number; saves_count: number; comments_count: number }
> {
  return listings.map((l) => {
    const c = counts.get(l.id)
    return {
      ...l,
      likes_count: c?.likes ?? 0,
      saves_count: c?.saves ?? 0,
      comments_count: c?.comments ?? 0,
    }
  })
}
