// Items engine — per-offering evidence for type pages (§8, §9, 034C).
//
// One query for a set of offerings: mention counts and distinct
// contributors from ACTIVE listings only, the best photo (first image
// of the most recent ACTIVE listing where the offering is the PRIMARY
// tag — a photo only evidences the item(s) it shows, so a secondary
// tag never lends its photo to another offering), and the active
// listing ids for the mentions section.
//
// Same rules as the business-page offerings component
// (components/businesses/business-offerings.tsx); kept as a shared
// helper so the type page and the business page cannot drift apart.

import type { SupabaseClient } from '@supabase/supabase-js'

export type ItemEvidence = {
  mentionCount: number
  contributors: number
  photoUrl: string | null
  latestMentionAt: string | null
  listingIds: string[]
}

export async function fetchItemsEvidence(
  admin: SupabaseClient,
  itemIds: string[],
): Promise<Map<string, ItemEvidence>> {
  const evidence = new Map<string, ItemEvidence>()
  for (const id of itemIds) {
    evidence.set(id, {
      mentionCount: 0,
      contributors: 0,
      photoUrl: null,
      latestMentionAt: null,
      listingIds: [],
    })
  }
  if (itemIds.length === 0) return evidence

  const { data: tags } = await admin
    .from('listing_item_tags')
    .select(
      'item_id, is_primary, listing:listings(id, user_id, status, created_at, images:listing_images(image_url, order_index))',
    )
    .in('item_id', itemIds)

  for (const itemId of itemIds) {
    const itemTags = (tags || []).filter((t) => t.item_id === itemId)
    const activeTags = itemTags.filter(
      (t) => (t.listing as { status?: string } | null)?.status === 'active',
    )
    const contributors = new Set(
      activeTags.map((t) => (t.listing as { user_id?: string } | null)?.user_id).filter(Boolean),
    )
    const listingIds = [
      ...new Set(
        activeTags.map((t) => (t.listing as { id?: string } | null)?.id).filter(Boolean) as string[],
      ),
    ]

    // Best photo: most recent ACTIVE listing where this offering is the
    // PRIMARY tag; its first image by order_index.
    let photoUrl: string | null = null
    const primaryActive = activeTags
      .filter((t) => t.is_primary)
      .sort(
        (a, b) =>
          new Date((b.listing as { created_at?: string } | null)?.created_at ?? 0).getTime() -
          new Date((a.listing as { created_at?: string } | null)?.created_at ?? 0).getTime(),
      )
    for (const tag of primaryActive) {
      const images = (
        (tag.listing as { images?: { image_url: string; order_index: number }[] } | null)
          ?.images || []
      )
        .filter((img) => img.image_url)
        .sort((a, b) => a.order_index - b.order_index)
      if (images.length > 0) {
        photoUrl = images[0].image_url
        break
      }
    }

    const latestMentionAt =
      activeTags.length > 0
        ? activeTags
            .map((t) => (t.listing as { created_at?: string } | null)?.created_at ?? '')
            .sort()
            .pop() ?? null
        : null

    evidence.set(itemId, {
      mentionCount: activeTags.length,
      contributors: contributors.size,
      photoUrl,
      latestMentionAt,
      listingIds,
    })
  }

  return evidence
}
