// Completion counters for the 3-step posting flow (proposal
// 2026-11-09, §0/§7): draft_started and draft_published, in
// posting_funnel_events (migration 048). The stopwatch can't prove
// the steps worked — started → published can.
//
// Best-effort by design: the insert is fire-and-forget, and a
// missing table (migration not applied yet) fails silently inside
// the promise — posting is never blocked by the counters.
import type { createClient } from '@/lib/supabase/client'
import type { ListingType } from '@/lib/types/database'

export function logPostingFunnel(
  supabase: ReturnType<typeof createClient>,
  event: 'draft_started' | 'draft_published',
  listingType: ListingType,
): void {
  supabase
    .from('posting_funnel_events')
    .insert({ event, listing_type: listingType })
    .then(
      () => undefined,
      () => undefined,
    )
}
