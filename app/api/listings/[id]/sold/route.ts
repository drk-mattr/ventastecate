// POST /api/listings/[id]/sold
//
// One-tap mark-as-sold for the listing owner (the sold loop: OfferUp's
// liquidity metric is % sold + time-to-sell, and the prominent sold
// button is the instrument that measures it).
//
//   body: { sold: boolean } — true marks the listing 'sold', false
//   returns it to 'active'. Owner-only (403 otherwise).
//
// sold_at is stamped by the migration 036 trigger on status change.
// Until 036 is applied the column does not exist, so this route tries
// the update WITH sold_at first and retries without it on 42703 —
// the status change is the core, the timestamp is a bonus.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

function isMissingColumn(error: { code?: string } | null): boolean {
  return !!error && (error.code === '42703' || error.code === 'PGRST204')
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
    return NextResponse.json({ error: 'Inicia sesión para continuar' }, { status: 401 })
  }

  const limit = rateLimit(`mark-sold:${user.id}`, 30, 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Demasiados intentos, espera un poco' }, { status: 429 })
  }

  let body: { sold?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  if (typeof body.sold !== 'boolean') {
    return NextResponse.json({ error: 'Falta el campo sold' }, { status: 400 })
  }
  const targetStatus = body.sold ? 'sold' : 'active'

  // Ownership check via the session client, then write via the admin
  // client (falls back to the session client if the service key is
  // missing — RLS lets owners update their own listings, as the edit
  // form already does client-side).
  const { data: listing, error: fetchError } = await supabase
    .from('listings')
    .select('id, user_id, status')
    .eq('id', listingId)
    .single()
  if (fetchError || !listing) {
    return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 404 })
  }
  if ((listing as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'No tienes permiso para cambiar este anuncio' }, { status: 403 })
  }

  const admin = createAdminClient()
  const writer = admin ?? supabase
  const nowIso = new Date().toISOString()
  const soldAt = body.sold ? nowIso : null

  // First try: status + sold_at in one update. The 036 trigger, when
  // applied, overwrites sold_at with now() on the transition anyway,
  // so the explicit value is only a fallback for a pre-036 database.
  let { error } = await writer
    .from('listings')
    .update({ status: targetStatus, sold_at: soldAt })
    .eq('id', listingId)
  if (error && isMissingColumn(error)) {
    // Migration 036 not applied yet — the column does not exist.
    // Retry with the status only; the sale still counts.
    const retry = await writer
      .from('listings')
      .update({ status: targetStatus })
      .eq('id', listingId)
    error = retry.error
  }
  if (error) {
    console.error('Failed to mark listing sold:', error.message)
    return NextResponse.json({ error: 'No se pudo actualizar el anuncio' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: targetStatus })
}
