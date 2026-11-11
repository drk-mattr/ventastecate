import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function authorized(request: NextRequest): boolean {
  const expected = process.env.INTERNAL_POST_TOKEN
  if (!expected) return false
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return false
  const token = header.slice('Bearer '.length)
  // Constant-time-ish comparison for equal-length strings.
  if (token.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

// Internal email-alert endpoint. NOT a public route: it requires the
// INTERNAL_POST_TOKEN Worker secret. The ventastecate-mail Email Worker
// posts one alert per incoming hola@ventastecate.com mail, then forwards
// the original to Gmail. POST only; there is no GET.
export async function POST(request: NextRequest) {
  try {
    if (!authorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Service key not configured' }, { status: 503 })
    }
    const body = await request.json()
    const from = typeof body.from === 'string' ? body.from.trim() : ''
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const rawBody = typeof body.body === 'string' ? body.body : ''
    const receivedAtRaw = typeof body.received_at === 'string' ? body.received_at.trim() : ''
    if (!from || from.length > 500) {
      return NextResponse.json({ error: 'from is required (max 500 characters)' }, { status: 400 })
    }
    if (subject.length > 500) {
      return NextResponse.json({ error: 'subject must be at most 500 characters' }, { status: 400 })
    }
    let receivedAt: string | null = null
    if (receivedAtRaw) {
      const parsed = new Date(receivedAtRaw)
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'received_at must be a valid date' }, { status: 400 })
      }
      receivedAt = parsed.toISOString()
    }
    const { data: alert, error: insertError } = await admin
      .from('email_alerts')
      .insert({
        from_address: from,
        subject,
        body: rawBody.slice(0, 8000),
        ...(receivedAt ? { received_at: receivedAt } : {}),
      })
      .select('id')
      .single()
    if (insertError || !alert) {
      return NextResponse.json({ error: 'Failed to save email alert' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id: alert.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
