import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

// POST /api/businesses/[id]/claim-request
// An owner asks to claim their business page. V1 is manual review: the
// request lands in /admin/claim-requests and a report points the moderator
// there. No WhatsApp-code auto-verification yet — that needs a
// message-sending provider and is a later step. Claiming is free and
// never a gate: unclaimed pages keep working exactly the same.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para reclamar el negocio' }, { status: 401 })

  const limit = rateLimit(`claim:${user.id}`, 3, 60 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Demasiados envíos, intenta más tarde' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const ownerName = typeof body.owner_name === 'string' ? body.owner_name.trim().slice(0, 100) : ''
  const whatsappRaw = typeof body.whatsapp_number === 'string' ? body.whatsapp_number.trim() : ''
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''
  const whatsapp = whatsappRaw.replace(/[\s()-]/g, '')
  if (!/^\+?\d{6,20}$/.test(whatsapp)) {
    return NextResponse.json({ error: 'Escribe un número de WhatsApp válido' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

  const { data: business } = await admin
    .from('businesses')
    .select('id, name, claimed_by')
    .eq('id', id)
    .single()
  if (!business) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  if ((business as { claimed_by?: string | null }).claimed_by) {
    return NextResponse.json({ error: 'Este negocio ya fue reclamado' }, { status: 409 })
  }

  // One pending request per user per business.
  const { data: existing } = await admin
    .from('business_claim_requests')
    .select('id')
    .eq('business_id', id)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ success: true, alreadyPending: true })
  }

  const { data: inserted, error: insertError } = await admin
    .from('business_claim_requests')
    .insert({
      business_id: id,
      user_id: user.id,
      owner_name: ownerName || null,
      whatsapp_number: whatsapp,
      note: note || null,
      status: 'pending',
    })
    .select('id')
    .single()
  if (insertError) {
    // Pre-032: the table is not there yet.
    if (insertError.code === '42P01' || insertError.code === 'PGRST204') {
      return NextResponse.json({ error: 'Aún no disponible, intenta más tarde' }, { status: 503 })
    }
    console.error('claim-request insert error:', insertError.message)
    return NextResponse.json({ error: 'No se pudo enviar la solicitud' }, { status: 500 })
  }

  const { data: requester } = await admin
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single()
  const requesterLabel = requester
    ? `${requester.display_name} (@${requester.username})`
    : 'Usuario'
  const description = [
    `Solicitud para reclamar "${business.name}".`,
    ownerName ? `Dueño: ${ownerName}` : null,
    `WhatsApp: ${whatsapp}`,
    note ? `Nota: ${note}` : null,
    `Revisar en /admin/claim-requests.`,
  ].filter(Boolean).join('\n')
  const { data: report } = await admin.from('reports').insert({
    type: 'business_claim',
    description,
    business_id: id,
    reporter_id: user.id,
    reporter_label: requesterLabel,
    status: 'new',
  }).select('id').single()
  if (report) {
    await admin.from('business_claim_requests').update({ report_id: report.id }).eq('id', inserted.id)
  }

  return NextResponse.json({ success: true })
}
