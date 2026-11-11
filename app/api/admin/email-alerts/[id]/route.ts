import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSuperadminProfile } from '@/lib/admin'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminProfile = await getSuperadminProfile()
  if (!adminProfile) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params
  const { status } = await request.json()
  if (!['new', 'read', 'archived'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  const supabase = await createClient()
  const { error } = await supabase.from('email_alerts').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  return NextResponse.json({ success: true })
}
