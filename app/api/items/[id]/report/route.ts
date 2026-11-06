// POST /api/items/[id]/report
//
// Report an offering as incorrect / duplicate / spam / prohibited.
// A report OPENS A REVIEW — it never hides the offering (§4, v1.1:
// a single report must not remove a legitimate offering, and no
// trigger in migration 034 changes any item status when a report is
// inserted). The moderator resolves it in /admin (future flow).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { auditItemEvent } from '@/lib/items/resolve-kind'

const REASONS = ['incorrecto', 'duplicado', 'spam', 'prohibido', 'otro'] as const

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: itemId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Inicia sesión para reportar' }, { status: 401 })
  }

  const limit = rateLimit(`item-report:${user.id}`, 10, 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Demasiados envíos, intenta más tarde' }, { status: 429 })
  }

  let body: { reason?: unknown }
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const reason =
    typeof body.reason === 'string' && (REASONS as readonly string[]).includes(body.reason)
      ? body.reason
      : 'incorrecto'

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

  const { data: item, error: itemError } = await admin
    .from('items')
    .select('id, status')
    .eq('id', itemId)
    .single()
  if (itemError || !item) {
    if (isMissingSchema(itemError)) {
      return NextResponse.json({ error: 'Aún no disponible, intenta más tarde' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 })
  }

  // One open report per user per offering: a repeat report is a
  // no-op success, not a second queue entry.
  const { data: existing } = await admin
    .from('item_reports')
    .select('id')
    .eq('item_id', itemId)
    .eq('reporter_id', user.id)
    .eq('status', 'open')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ success: true, already: true })
  }

  const { error: reportError } = await admin.from('item_reports').insert({
    item_id: itemId,
    reporter_id: user.id,
    reason,
    status: 'open',
  })
  if (reportError) {
    if (isMissingSchema(reportError)) {
      return NextResponse.json({ error: 'Aún no disponible, intenta más tarde' }, { status: 503 })
    }
    console.error('item report insert error:', reportError.message)
    return NextResponse.json({ error: 'No se pudo enviar el reporte' }, { status: 500 })
  }

  await auditItemEvent(admin, {
    item_id: itemId,
    actor_id: user.id,
    event: 'reported',
    details: { reason },
  })

  return NextResponse.json({ success: true })
}
