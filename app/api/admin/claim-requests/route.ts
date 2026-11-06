import { NextRequest, NextResponse } from 'next/server'
import { getSuperadminProfile } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/claim-requests — superadmin only.
// { id, action: 'approve' | 'reject' }
// Approving marks the business claimed (claimed_by + claimed_at) and
// resolves the linked report; rejecting just closes the request. Neither
// touches user-added info — it stays after a claim.
export async function POST(request: NextRequest) {
  const adminProfile = await getSuperadminProfile()
  if (!adminProfile) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const id = body.id
  const action = body.action
  if (typeof id !== 'string' || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

  const { data: claim, error } = await admin
    .from('business_claim_requests')
    .select('id, business_id, user_id, report_id, status')
    .eq('id', id)
    .single()
  if (error || !claim) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (claim.status !== 'pending') {
    return NextResponse.json({ error: 'Esta solicitud ya fue revisada' }, { status: 409 })
  }

  const status = action === 'approve' ? 'approved' : 'rejected'
  const { error: updateError } = await admin
    .from('business_claim_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (updateError) {
    console.error('claim-request review error:', updateError.message)
    return NextResponse.json({ error: 'No se pudo actualizar la solicitud' }, { status: 500 })
  }

  if (action === 'approve') {
    const { error: claimError } = await admin
      .from('businesses')
      .update({ claimed_by: claim.user_id, claimed_at: new Date().toISOString() })
      .eq('id', claim.business_id)
    if (claimError) {
      console.error('claim approve business update error:', claimError.message)
      return NextResponse.json({ error: 'No se pudo marcar el negocio como reclamado' }, { status: 500 })
    }
  }

  if (claim.report_id) {
    await admin.from('reports').update({ status: 'resolved' }).eq('id', claim.report_id)
    await admin.from('report_notes').insert({
      report_id: claim.report_id,
      author_id: adminProfile.id,
      kind: 'note',
      body: action === 'approve'
        ? 'Reclamo aprobado: el negocio ahora muestra "Negocio reclamado".'
        : 'Reclamo rechazado.',
    })
  }

  return NextResponse.json({ success: true, status })
}
