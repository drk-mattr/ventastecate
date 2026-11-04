import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSuperadminProfile } from '@/lib/admin'
import { sendReportReply } from '@/lib/email/resend'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminProfile = await getSuperadminProfile()
  if (!adminProfile) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params
  const { status } = await request.json()
  if (!['new', 'reviewed', 'resolved'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  const supabase = await createClient()
  const { error } = await supabase.from('reports').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminProfile = await getSuperadminProfile()
  if (!adminProfile) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params
  const { action, body } = await request.json()
  if (!body || typeof body !== 'string' || !body.trim()) return NextResponse.json({ error: 'Falta el texto' }, { status: 400 })
  const supabase = await createClient()
  const { data: report } = await supabase.from('reports').select('id, email, type, description').eq('id', id).single()
  if (!report) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
  if (action === 'reply') {
    if (!report.email) return NextResponse.json({ error: 'Este reporte no tiene email para responder' }, { status: 400 })
    const sent = await sendReportReply({ to: report.email, reportType: report.type, reportDescription: report.description || '', replyBody: body.trim() })
    if (!sent.success) return NextResponse.json({ error: 'No se pudo enviar el correo' }, { status: 500 })
  } else if (action !== 'note') {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }
  const { error } = await supabase.from('report_notes').insert({
    report_id: id, author_id: adminProfile.id, kind: action === 'reply' ? 'reply' : 'note', body: body.trim(),
  })
  if (error) return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  return NextResponse.json({ success: true })
}
