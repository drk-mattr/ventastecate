import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function authorized(request: NextRequest): boolean {
  const expected = process.env.INTERNAL_POST_TOKEN
  if (!expected) return false
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return false
  const token = header.slice('Bearer '.length)
  if (token.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

// Read-only internal triage feed: lets the internal agent list reports and
// draft notes/replies for the superadmin, without a site login. No writes here.
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Service key not configured' }, { status: 503 })
  const status = request.nextUrl.searchParams.get('status')
  let q = admin.from('reports').select('id, type, description, email, listing_id, listing_title, reporter_label, status, created_at').order('created_at', { ascending: false }).limit(50)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: 'Error al leer reportes' }, { status: 500 })
  return NextResponse.json({ reports: data })
}
