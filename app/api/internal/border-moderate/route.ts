import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { setBorderReportHidden } from '@/lib/border/moderate'

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

// Internal moderator endpoint for border posts, same token as
// community posting / listing moderation. Actions are reversible
// only: hide (sets hidden_at, leaves the feed + estimate) and
// restore (clears it). Nothing is ever deleted here. Every action
// is logged to moderation_log with a reason, so it can be audited
// and reversed. Ambiguous cases should be flagged to Greg, not
// hidden unilaterally. A single user flag never hides anything —
// hiding is always a human decision.
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
    const action = body.action
    const reportId = typeof body.border_report_id === 'string' ? body.border_report_id : ''
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if ((action !== 'hide' && action !== 'restore') || !reportId || !reason) {
      return NextResponse.json(
        { error: 'action (hide|restore), border_report_id and reason are required' },
        { status: 400 },
      )
    }
    const result = await setBorderReportHidden(admin, {
      reportId,
      action,
      reason,
      actor: 'internal-community',
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({
      border_report_id: reportId,
      hidden: result.hidden,
      logged: result.logged,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
