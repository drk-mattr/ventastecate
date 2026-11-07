// Items engine — homepage item carousel data (DoorDash "Featured
// Items" row, 034D activity ordering).
//
// The carousel shows the top trending OFFERINGS across all kinds in
// the current place scope — the same activity_score + §11.3 gate the
// type pages use (fetchItemActivity), just with every approved kind
// as the input instead of one kind's descendants. No new ranking is
// invented here: if the gate does not pass, the carousel renders
// nothing — same cold-start rule as the trending strip.
//
// A card is the honest signal only: best photo (from the most recent
// ACTIVE listing where the offering is the PRIMARY tag —
// fetchItemsEvidence), kind name, the business it belongs to, and
// the mention count. NO price, NO like-percentage: there are no
// ratings or reliable prices yet, so mentions are the signal.

import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchItemActivity, TRENDING_LIMIT } from '@/lib/items/activity'
import { fetchItemsEvidence } from '@/lib/items/evidence'

export type TrendingItemCard = {
  itemId: string
  kindId: string
  kindName: string
  kindSlug: string
  businessId: string
  businessName: string
  businessCity: string | null
  businessLocation: string | null
  photoUrl: string | null
  mentionCount: number
  contributors: number
  rank: number
}

export async function fetchTrendingItems(
  admin: SupabaseClient,
  towns: string[] | null,
  regionLabel: string,
): Promise<{ cards: TrendingItemCard[]; available: boolean }> {
  const empty = { cards: [] as TrendingItemCard[], available: false }

  // Every approved kind is a candidate: the carousel is the
  // cross-kind "En tendencia" list, not one kind's list.
  const { data: kinds } = await admin
    .from('item_kinds')
    .select('id')
    .eq('status', 'approved')
    .limit(500)
  const kindIds = ((kinds || []) as { id: string }[]).map((k) => k.id)
  if (kindIds.length === 0) return empty

  // Migration 035 not applied yet → available: false, no carousel.
  const activity = await fetchItemActivity(admin, kindIds, towns, regionLabel)
  if (!activity.available || !activity.gate.passes) {
    return { cards: [], available: activity.available }
  }

  const rows = activity.rows.slice(0, TRENDING_LIMIT)
  if (rows.length === 0) return { cards: [], available: true }

  const itemIds = rows.map((r) => r.itemId)
  const { data: items } = await admin
    .from('items')
    .select('id, business_id, kind_id, kind:item_kinds(id, name, slug)')
    .in('id', itemIds)
    .eq('status', 'visible')
  const itemRows = (items || []) as {
    id: string
    business_id: string
    kind_id: string
    kind: { id?: string; name?: string; slug?: string } | null
  }[]
  const businessIds = [...new Set(itemRows.map((i) => i.business_id))]
  const { data: businesses } =
    businessIds.length > 0
      ? await admin
          .from('businesses')
          .select('id, name, city, location')
          .in('id', businessIds)
      : { data: [] as { id: string; name: string; city: string | null; location: string | null }[] }
  const bizById = new Map(
    ((businesses || []) as { id: string; name: string; city: string | null; location: string | null }[]).map(
      (b) => [b.id, b],
    ),
  )
  const evidence = await fetchItemsEvidence(admin, itemIds)

  const cards: TrendingItemCard[] = []
  for (const [index, row] of rows.entries()) {
    const item = itemRows.find((i) => i.id === row.itemId)
    const biz = item ? bizById.get(item.business_id) : undefined
    if (!item || !biz) continue
    const ev = evidence.get(item.id) ?? {
      mentionCount: 0,
      contributors: 0,
      photoUrl: null,
      latestMentionAt: null,
      listingIds: [],
    }
    cards.push({
      itemId: item.id,
      kindId: item.kind_id,
      kindName: item.kind?.name ?? '',
      kindSlug: item.kind?.slug ?? '',
      businessId: biz.id,
      businessName: biz.name,
      businessCity: biz.city,
      businessLocation: biz.location,
      photoUrl: ev.photoUrl,
      mentionCount: ev.mentionCount,
      contributors: ev.contributors,
      rank: index + 1,
    })
  }
  return { cards, available: true }
}
