// Items engine — the food subtree of the kind tree.
//
// Gastro is the food-discovery surface, so it needs the set of
// kinds that are food: every approved kind whose top-level
// ancestor (the root of its parent chain) is a food parent. The
// tree is food-first today — all 44 live kinds are food — but the
// helper stays correct if non-food branches are seeded later:
// a future 'servicios' branch would simply not be food.
//
// The roots are the seed parents from 034 plus 'antojitos'
// (migration 059). A kind with no parent is its own root.

import type { SupabaseClient } from '@supabase/supabase-js'

export const FOOD_ROOT_SLUGS = [
  'tacos',
  'tamales',
  'burritos',
  'cafe',
  'bebidas',
  'pan-dulce',
  'postres',
  'mariscos',
  'hamburguesas',
  'pizza',
  'antojitos',
] as const

export async function fetchFoodKindIds(admin: SupabaseClient): Promise<string[]> {
  const { data } = await admin
    .from('item_kinds')
    .select('id, slug, parent_id')
    .eq('status', 'approved')
    .limit(500)
  const kinds = (data || []) as { id: string; slug: string; parent_id: string | null }[]
  if (kinds.length === 0) return []

  const byId = new Map(kinds.map((k) => [k.id, k]))
  const foodRoots = new Set<string>(FOOD_ROOT_SLUGS)
  const foodIds: string[] = []
  for (const kind of kinds) {
    // Walk to the root of this kind's parent chain (guarded against
    // cycles — the 034 trigger blocks them, but never loop forever).
    let current: { id: string; slug: string; parent_id: string | null } | undefined = kind
    const seen = new Set<string>()
    while (current?.parent_id && byId.has(current.parent_id) && !seen.has(current.id)) {
      seen.add(current.id)
      current = byId.get(current.parent_id)
    }
    if (current && foodRoots.has(current.slug)) foodIds.push(kind.id)
  }
  return foodIds
}
