// GET /api/items/search?business_id=<uuid>&q=<text>
//
// Type-ahead for the item picker (§5, §8): the business's existing
// offerings (visible) plus approved kinds matching the query — by
// canonical name or by alias. Public read; the response is filtered
// server-side to visible offerings and approved kinds only.
//
// - Empty q: the business's offerings (most mentioned first), no kinds.
// - With q: offerings whose kind matches, then kinds not already
//   offered by this business (leaf kinds first, then parents), max 8.
// - Mention counts count ACTIVE listings only; contributors are the
//   distinct users who mentioned the offering.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeSearchKey } from '@/lib/items/normalize'

function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id') || ''
  const q = (searchParams.get('q') || '').trim()
  if (!businessId) {
    return NextResponse.json({ error: 'Falta business_id' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

  const { data: business, error: bizError } = await admin
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .maybeSingle()
  if (bizError || !business) {
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }

  // The business's visible offerings, with their kinds.
  const { data: items, error: itemsError } = await admin
    .from('items')
    .select('id, kind_id, origin, created_by, created_at, kind:item_kinds(id, name, slug, parent_id, status)')
    .eq('business_id', businessId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true })
    .limit(50)
  if (itemsError) {
    // Pre-034A guard: the tables are missing — answer 503 instead of
    // crashing. The user runs migration 034 in the SQL editor.
    if (itemsError.code === '42P01' || itemsError.code === 'PGRST204') {
      return NextResponse.json({ error: 'Aún no disponible, intenta más tarde' }, { status: 503 })
    }
    console.error('items search error:', itemsError.message)
    return NextResponse.json({ error: 'No se pudo buscar' }, { status: 500 })
  }

  const normalizedQ = normalizeSearchKey(q)
  const itemRows = (items || []).filter((row) => {
    if (!q) return true
    const kind = row.kind as { name?: string } | null
    if (!kind?.name) return false
    return normalizeSearchKey(kind.name).includes(normalizedQ)
  })

  // Mention counts + distinct contributors, from ACTIVE listings only.
  const mentionCount = new Map<string, number>()
  const contributors = new Map<string, Set<string>>()
  const itemIds = itemRows.map((row) => row.id)
  if (itemIds.length > 0) {
    const { data: tags } = await admin
      .from('listing_item_tags')
      .select('item_id, listing:listings(id, user_id, status)')
      .in('item_id', itemIds)
    for (const tag of tags || []) {
      const listing = tag.listing as { user_id?: string; status?: string } | null
      if (!listing || listing.status !== 'active') continue
      mentionCount.set(tag.item_id, (mentionCount.get(tag.item_id) ?? 0) + 1)
      if (listing.user_id) {
        if (!contributors.has(tag.item_id)) contributors.set(tag.item_id, new Set())
        contributors.get(tag.item_id)!.add(listing.user_id)
      }
    }
  }

  const itemsOut = itemRows
    .map((row) => {
      const kind = row.kind as unknown as { id: string; name: string; slug: string } | null
      return {
        id: row.id,
        kind_id: row.kind_id,
        kind_name: kind?.name ?? '',
        kind_slug: kind?.slug ?? '',
        origin: row.origin,
        mention_count: mentionCount.get(row.id) ?? 0,
        contributors: contributors.get(row.id)?.size ?? 0,
      }
    })
    .filter((row) => row.kind_name.length > 0)
    .sort((a, b) => b.mention_count - a.mention_count || b.contributors - a.contributors)

  // Approved kinds matching the query (name or alias), excluding kinds
  // this business already offers — those are in `items` above.
  let kindsOut: { id: string; name: string; slug: string; parent_id: string | null }[] = []
  if (q) {
    const offeredKindIds = new Set(itemRows.map((row) => row.kind_id))
    const [aliasMatch, nameMatch] = await Promise.all([
      admin
        .from('item_kind_aliases')
        .select('kind_id')
        .ilike('search_key', `%${escapeLike(normalizedQ)}%`)
        .limit(20),
      admin
        .from('item_kinds')
        .select('id, name, slug, parent_id')
        .eq('status', 'approved')
        .ilike('name', `%${escapeLike(q)}%`)
        .limit(20),
    ])
    const kindIds = new Set<string>()
    for (const row of aliasMatch.data || []) kindIds.add(row.kind_id)
    for (const row of nameMatch.data || []) kindIds.add(row.id)
    if (kindIds.size > 0) {
      const { data: kinds } = await admin
        .from('item_kinds')
        .select('id, name, slug, parent_id')
        .in('id', [...kindIds])
        .eq('status', 'approved')
      kindsOut = (kinds || [])
        .filter((k) => !offeredKindIds.has(k.id))
        // Leaf kinds first (they have a parent), then parents, then name.
        .sort((a, b) => {
          const aLeaf = a.parent_id ? 0 : 1
          const bLeaf = b.parent_id ? 0 : 1
          return aLeaf - bLeaf || a.name.localeCompare(b.name, 'es')
        })
        .slice(0, 8)
    }
  }

  return NextResponse.json({ items: itemsOut, kinds: kindsOut })
}
