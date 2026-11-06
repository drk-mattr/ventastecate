// POST /api/businesses/[id]/items
//
// Add an offering to a business WITHOUT a full publication (§8:
// "¿Falta algo que venden aquí?"). Body: { kind_id } or { kind_name }.
// The offering goes live instantly, attributed to its creator, with
// origin 'community' — or 'owner_claim' when the caller is the
// business's claimed owner (the owner is authoritative about their
// menu, never about quality — §6, §7.4).
//
// A new kind is created pending and parentless until a moderator
// places it (§4). Creating the same (business, kind) twice resolves
// to the existing offering (conflict-safe upsert, §5).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { resolveKind, upsertItem, auditItemEvent } from '@/lib/items/resolve-kind'

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: businessId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Inicia sesión para agregar una oferta' }, { status: 401 })
  }

  const limit = rateLimit(`business-items:${user.id}`, 20, 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Demasiados envíos, intenta más tarde' }, { status: 429 })
  }

  let body: { kind_id?: unknown; kind_name?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const input =
    typeof body.kind_id === 'string' && body.kind_id
      ? { kind_id: body.kind_id }
      : typeof body.kind_name === 'string' && body.kind_name.trim()
        ? { kind_name: body.kind_name.trim() }
        : null
  if (!input) {
    return NextResponse.json({ error: 'Elige o escribe lo que venden aquí' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

  const { data: business, error: bizError } = await admin
    .from('businesses')
    .select('id, claimed_by')
    .eq('id', businessId)
    .single()
  if (bizError || !business) {
    if (isMissingSchema(bizError)) {
      return NextResponse.json({ error: 'Aún no disponible, intenta más tarde' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }

  const origin = business.claimed_by === user.id ? 'owner_claim' : 'community'

  let resolved: { kindId: string; kindName: string; kindCreated: boolean }
  try {
    resolved = await resolveKind(admin, user.id, input)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo agregar la oferta'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  let item
  try {
    item = await upsertItem(admin, user.id, businessId, resolved.kindId, origin)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo agregar la oferta'
    return NextResponse.json({ error: message }, { status: 400 })
  }
  if (item.status !== 'visible') {
    return NextResponse.json({ error: 'Esa oferta está en revisión' }, { status: 400 })
  }

  if (resolved.kindCreated) {
    await auditItemEvent(admin, {
      kind_id: resolved.kindId,
      actor_id: user.id,
      event: 'created',
      details: { source: 'business_page', business_id: businessId },
    })
  }
  if (item.created) {
    await auditItemEvent(admin, {
      item_id: item.id,
      kind_id: resolved.kindId,
      actor_id: user.id,
      event: 'created',
      details: { source: 'business_page', business_id: businessId, origin },
    })
  }

  return NextResponse.json({
    success: true,
    item: {
      id: item.id,
      kind_id: resolved.kindId,
      kind_name: resolved.kindName,
      origin,
      created: item.created,
    },
  })
}
