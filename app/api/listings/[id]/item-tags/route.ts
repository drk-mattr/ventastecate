// POST /api/listings/[id]/item-tags
//
// Tag a listing with offerings (§3, §6, §7.4). The body replaces the
// listing's item tags: [{ item_id } | { kind_id } | { kind_name }].
// The FIRST entry is the primary tag; the rest are secondary (they do
// not get the full weight of the listing).
//
// Enforcement, in order (the DB trigger is the backstop, never the
// only check):
//   1. the listing belongs to the posting user (403 otherwise),
//   2. the listing has a tagged business — no item tag without the
//      business (decision 4),
//   3. every offering belongs to that business (400 otherwise),
//   4. created_by is always the posting user, never client-supplied.
// Kinds named by the user are resolved or created pending (§5);
// offerings are upserted on UNIQUE(business_id, kind_id) so two
// concurrent creations resolve to the same row.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { resolveKind, upsertItem, auditItemEvent, type KindInput } from '@/lib/items/resolve-kind'

const MAX_TAGS = 5

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: listingId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Inicia sesión para etiquetar ofertas' }, { status: 401 })
  }

  const limit = rateLimit(`item-tags:${user.id}`, 20, 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Demasiados envíos, intenta más tarde' }, { status: 429 })
  }

  let body: { items?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const entries = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : []
  if (entries.length === 0) {
    return NextResponse.json({ error: 'Elige al menos una oferta' }, { status: 400 })
  }
  if (entries.length > MAX_TAGS) {
    return NextResponse.json({ error: `Máximo ${MAX_TAGS} ofertas por publicación` }, { status: 400 })
  }
  const inputs: KindInput[] = []
  const existingItemIds: (string | null)[] = []
  for (const entry of entries) {
    if (typeof entry.item_id === 'string' && entry.item_id) {
      inputs.push({})
      existingItemIds.push(entry.item_id)
    } else if (typeof entry.kind_id === 'string' && entry.kind_id) {
      inputs.push({ kind_id: entry.kind_id })
      existingItemIds.push(null)
    } else if (typeof entry.kind_name === 'string' && entry.kind_name.trim()) {
      inputs.push({ kind_name: entry.kind_name.trim() })
      existingItemIds.push(null)
    } else {
      return NextResponse.json({ error: 'Cada oferta necesita un tipo o una oferta' }, { status: 400 })
    }
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

  const { data: listing, error: listingError } = await admin
    .from('listings')
    .select('id, user_id, tagged_business_id, status')
    .eq('id', listingId)
    .single()
  if (listingError || !listing) {
    if (isMissingSchema(listingError)) {
      return NextResponse.json({ error: 'Aún no disponible, intenta más tarde' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 })
  }
  if (listing.user_id !== user.id) {
    return NextResponse.json({ error: 'Solo el autor puede etiquetar esta publicación' }, { status: 403 })
  }
  if (!listing.tagged_business_id) {
    return NextResponse.json(
      { error: 'Primero etiqueta el negocio para etiquetar sus ofertas' },
      { status: 400 },
    )
  }
  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'La publicación ya no está activa' }, { status: 400 })
  }
  const businessId = listing.tagged_business_id as string

  // Resolve every entry to an offering of THIS business.
  const resolvedIds: string[] = []
  try {
    for (let i = 0; i < inputs.length; i++) {
      const existingId = existingItemIds[i]
      if (existingId) {
        const { data: item, error: itemError } = await admin
          .from('items')
          .select('id, business_id, status')
          .eq('id', existingId)
          .single()
        if (itemError || !item) {
          return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 400 })
        }
        if (item.business_id !== businessId) {
          return NextResponse.json(
            { error: 'Esa oferta pertenece a otro negocio' },
            { status: 400 },
          )
        }
        if (item.status !== 'visible') {
          return NextResponse.json({ error: 'Esa oferta no está disponible' }, { status: 400 })
        }
        resolvedIds.push(item.id)
        continue
      }
      const { kindId, kindCreated } = await resolveKind(admin, user.id, inputs[i])
      const item = await upsertItem(admin, user.id, businessId, kindId, 'mention')
      if (item.status !== 'visible') {
        return NextResponse.json({ error: 'Esa oferta no está disponible' }, { status: 400 })
      }
      if (kindCreated) {
        await auditItemEvent(admin, {
          kind_id: kindId,
          actor_id: user.id,
          event: 'created',
          details: { source: 'listing_tag', listing_id: listingId },
        })
      }
      if (item.created) {
        await auditItemEvent(admin, {
          item_id: item.id,
          kind_id: kindId,
          actor_id: user.id,
          event: 'created',
          details: { source: 'listing_tag', listing_id: listingId, origin: 'mention' },
        })
      }
      resolvedIds.push(item.id)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudieron guardar las ofertas'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Replace the listing's tags (the author owns them). The DB trigger
  // re-checks business consistency on every insert.
  const { error: deleteError } = await admin
    .from('listing_item_tags')
    .delete()
    .eq('listing_id', listingId)
  if (deleteError) {
    console.error('item-tags delete error:', deleteError.message)
    return NextResponse.json({ error: 'No se pudieron guardar las ofertas' }, { status: 500 })
  }
  const { error: insertError } = await admin.from('listing_item_tags').insert(
    resolvedIds.map((itemId, index) => ({
      listing_id: listingId,
      item_id: itemId,
      is_primary: index === 0,
      created_by: user.id,
    })),
  )
  if (insertError) {
    if (insertError.message.includes('different business')) {
      return NextResponse.json({ error: 'Esa oferta pertenece a otro negocio' }, { status: 400 })
    }
    console.error('item-tags insert error:', insertError.message)
    return NextResponse.json({ error: 'No se pudieron guardar las ofertas' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    items: resolvedIds.map((itemId, index) => ({ item_id: itemId, is_primary: index === 0 })),
  })
}
