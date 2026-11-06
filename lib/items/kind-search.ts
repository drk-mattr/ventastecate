// Items engine — kind search for discovery (§5, §8, 034C).
//
// Shared by GET /api/items/kinds and the /search "Tipos" section.
// Resolves a query to kinds through the §5 pipeline: exact canonical /
// alias match first, then normalized substring suggestions
// (accent-insensitive; de/con are NOT stripped). The UI offers the
// matches; nothing is ever auto-applied or silently merged.
//
// Only approved kinds are returned. A parent kind matches its own name
// (and is the broader filter); its children match theirs. Each hit
// carries its parent, so the UI can show the breadcrumb
// ("Tacos › Tacos de adobada") and the offering count in scope.
//
// Scale note: this fetches all approved kinds + aliases and matches in
// JS. The taxonomy is ~40 kinds today; if it grows past a few hundred,
// move the matching to a DB-side pg_trgm query — the trigram indexes
// from 034A are already there for it.

import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeSearchKey } from './normalize'

export type KindSearchHit = {
  id: string
  name: string
  slug: string
  parent_id: string | null
  parent_name: string | null
  parent_slug: string | null
  offering_count: number
}

type KindRow = { id: string; name: string; slug: string; parent_id: string | null }
type AliasRow = { kind_id: string; alias: string; search_key: string }

export async function searchKinds(
  admin: SupabaseClient,
  rawQuery: string,
  opts?: { towns?: string[] | null; limit?: number },
): Promise<KindSearchHit[]> {
  const limit = opts?.limit ?? 12
  const q = normalizeSearchKey(rawQuery.replace(/^#+/, '').trim())

  const { data: kinds, error: kindsError } = await admin
    .from('item_kinds')
    .select('id, name, slug, parent_id')
    .eq('status', 'approved')
    .limit(500)
  if (kindsError) throw kindsError
  const kindRows = (kinds || []) as KindRow[]
  if (kindRows.length === 0) return []

  // Aliases are best-effort: a missing alias table must not break the
  // name search (the caller maps a 42P01 on kinds to 503 instead).
  const { data: aliases } = await admin
    .from('item_kind_aliases')
    .select('kind_id, alias, search_key')
    .limit(1000)
  const aliasRows = (aliases || []) as AliasRow[]

  const byId = new Map(kindRows.map((k) => [k.id, k]))
  const aliasByKind = new Map<string, AliasRow[]>()
  for (const a of aliasRows) {
    const list = aliasByKind.get(a.kind_id) ?? []
    list.push(a)
    aliasByKind.set(a.kind_id, list)
  }

  // Score, then leaf kinds first (they are the specific filter), then
  // name. An exact match always beats a substring one, so the parent
  // "Tacos" wins for q="tacos" over a child that merely contains it —
  // and the children still follow right behind it.
  let scored: { kind: KindRow; score: number }[]
  if (!q) {
    // Empty query: the approved roots, ordered by offerings below.
    scored = kindRows.filter((k) => !k.parent_id).map((kind) => ({ kind, score: 0 }))
  } else {
    scored = []
    for (const kind of kindRows) {
      const nameKey = normalizeSearchKey(kind.name)
      const kindAliases = aliasByKind.get(kind.id) ?? []
      let score: number | null = null
      if (kind.slug === q || kindAliases.some((a) => a.search_key === q)) {
        score = 0 // exact canonical or alias
      } else if (nameKey.startsWith(q)) {
        score = 1
      } else if (nameKey.includes(q)) {
        score = 2
      } else if (kindAliases.some((a) => a.search_key.includes(q))) {
        score = 3
      }
      if (score !== null) scored.push({ kind, score })
    }
    scored.sort(
      (a, b) =>
        a.score - b.score ||
        (a.kind.parent_id ? 0 : 1) - (b.kind.parent_id ? 0 : 1) ||
        a.kind.name.localeCompare(b.kind.name, 'es'),
    )
    scored = scored.slice(0, limit)
  }

  // Visible-offering counts per kind. The place of an offering is its
  // business's town (§11.1), so a towns filter counts only the offers
  // whose business is in scope — a count that survives the click
  // through to the type page in the same scope.
  const towns = opts?.towns ?? null
  const counts = new Map<string, number>()
  const pickedIds = scored.map((s) => s.kind.id)
  if (pickedIds.length > 0) {
    const { data: items } = await admin
      .from('items')
      .select('kind_id, business:businesses(city, location)')
      .in('kind_id', pickedIds)
      .eq('status', 'visible')
      .limit(2000)
    for (const row of (items || []) as {
      kind_id: string
      business: { city?: string | null; location?: string | null } | null
    }[]) {
      const biz = row.business
      if (
        towns &&
        !(biz && (towns.includes(biz.city ?? '') || (!biz.city && towns.includes(biz.location ?? ''))))
      ) {
        continue
      }
      counts.set(row.kind_id, (counts.get(row.kind_id) ?? 0) + 1)
    }
  }

  const hits: KindSearchHit[] = scored.map(({ kind }) => {
    const parent = kind.parent_id ? (byId.get(kind.parent_id) ?? null) : null
    return {
      id: kind.id,
      name: kind.name,
      slug: kind.slug,
      parent_id: kind.parent_id,
      parent_name: parent?.name ?? null,
      parent_slug: parent?.slug ?? null,
      offering_count: counts.get(kind.id) ?? 0,
    }
  })

  // Empty query: most-offered roots first, then slice.
  if (!q) {
    hits.sort((a, b) => b.offering_count - a.offering_count || a.name.localeCompare(b.name, 'es'))
    return hits.slice(0, limit)
  }
  return hits
}
