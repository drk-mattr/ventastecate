// POST /api/items/[id]/feedback
//
// Set or clear one user's answer to "¿Lo recomendarías?" on one
// offering. One ACTIVE opinion per user per item (the item_feedback
// PK): setting it upserts, never duplicates; sending null clears
// it. Signed-in only, rate-limited, plain Spanish errors. The
// claimed owner of the business cannot opine on their own
// offerings (403 — brief §7.2, same rule as business reviews).
// Pre-059 the table does not exist and the route answers 503 (the
// item view hides the row until then).
//
// The response carries the fresh aggregate so the button can update
// without a second round trip: recommends (the count that shows),
// total (independent opinions — the count only shows once this
// reaches 5), and mine (the viewer's current opinion, or null).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { fetchItemFeedback } from '@/lib/items/evidence'

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: itemId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Inicia sesión para recomendar' }, { status: 401 })
    }

    const limit = rateLimit(`item-feedback:${user.id}`, 10, 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Demasiados envíos, intenta más tarde' }, { status: 429 })
    }

    let body: { recommends?: unknown }
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const recommends = body.recommends
    if (recommends !== true && recommends !== false && recommends !== null) {
      return NextResponse.json({ error: 'Elige sí o no para recomendar' }, { status: 400 })
    }

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

    // The offering must exist and be visible — no opinions on a
    // hidden offering.
    const { data: item, error: itemError } = await admin
      .from('items')
      .select('id, status, business_id')
      .eq('id', itemId)
      .single()
    if (itemError || !item) {
      if (isMissingSchema(itemError)) {
        return NextResponse.json(
          { error: 'Las recomendaciones aún no están activadas (falta aplicar la migración 059)' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 })
    }
    if (item.status !== 'visible') {
      return NextResponse.json({ error: 'Oferta no disponible' }, { status: 404 })
    }

    // The claimed owner cannot opine on their own offerings. A
    // clear (null) is harmless — an owner never has a row — so the
    // block applies only to setting an opinion.
    if (recommends !== null) {
      const { data: business } = await admin
        .from('businesses')
        .select('claimed_by')
        .eq('id', item.business_id)
        .maybeSingle()
      const claimedBy = (business as { claimed_by?: string | null } | null)?.claimed_by ?? null
      if (claimedBy && claimedBy === user.id) {
        return NextResponse.json(
          { error: 'No puedes recomendar los artículos de tu propio negocio' },
          { status: 403 },
        )
      }
    }

    if (recommends === null) {
      const { error: deleteError } = await admin
        .from('item_feedback')
        .delete()
        .eq('item_id', itemId)
        .eq('user_id', user.id)
      if (deleteError) {
        if (isMissingSchema(deleteError)) {
          return NextResponse.json(
            { error: 'Las recomendaciones aún no están activadas (falta aplicar la migración 059)' },
            { status: 503 },
          )
        }
        console.error('item feedback delete error:', deleteError?.message)
        return NextResponse.json({ error: 'No se pudo quitar tu opinión' }, { status: 500 })
      }
    } else {
      const { error: upsertError } = await admin.from('item_feedback').upsert(
        { item_id: itemId, user_id: user.id, recommends },
        { onConflict: 'item_id,user_id' },
      )
      if (upsertError) {
        if (isMissingSchema(upsertError)) {
          return NextResponse.json(
            { error: 'Las recomendaciones aún no están activadas (falta aplicar la migración 059)' },
            { status: 503 },
          )
        }
        console.error('item feedback upsert error:', upsertError?.message)
        return NextResponse.json({ error: 'No se pudo guardar tu opinión' }, { status: 500 })
      }
    }

    const summary = await fetchItemFeedback(admin, itemId, user.id)
    return NextResponse.json(
      {
        feedback: {
          recommends: summary.recommends,
          total: summary.total,
          mine: summary.mine,
        },
      },
      { status: 200 },
    )
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
