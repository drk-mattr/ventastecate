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
//
// Counts are INDEPENDENT evidence (§7.4, 034D): mentions by the
// claimed owner of the business never count toward mentionCount or
// contributors — the owner cannot score their own offerings. The
// listing ids (the mentions feed), the best photo and the latest
// mention still cover all active mentions: an owner post is a real
// publication, it just is not independent evidence.

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

  // Claimed owners, so their own mentions can be excluded from the
  // independent counts below (§7.4). A business with no claimed
  // owner has no owner to exclude.
  const { data: itemBiz } = await admin
    .from('items')
    .select('id, business_id')
    .in('id', itemIds)
  const itemToBusiness = new Map(
    ((itemBiz || []) as { id: string; business_id: string }[]).map((r) => [r.id, r.business_id]),
  )
  const bizIds = [...new Set(itemToBusiness.values())]
  const claimedBy = new Map<string, string | null>()
  if (bizIds.length > 0) {
    const { data: bizRows } = await admin
      .from('businesses')
      .select('id, claimed_by')
      .in('id', bizIds)
    for (const b of (bizRows || []) as { id: string; claimed_by: string | null }[]) {
      claimedBy.set(b.id, b.claimed_by)
    }
  }

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
    // Independent evidence only: the claimed owner's own posts do
    // not count as community mentions of their own offering.
    const ownerId = claimedBy.get(itemToBusiness.get(itemId) ?? '') ?? null
    const independentTags = ownerId
      ? activeTags.filter((t) => (t.listing as { user_id?: string } | null)?.user_id !== ownerId)
      : activeTags
    const contributors = new Set(
      independentTags.map((t) => (t.listing as { user_id?: string } | null)?.user_id).filter(Boolean),
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
      mentionCount: independentTags.length,
      contributors: contributors.size,
      photoUrl,
      latestMentionAt,
      listingIds,
    })
  }

  return evidence
}
