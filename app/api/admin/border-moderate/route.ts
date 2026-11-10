import { NextRequest, NextResponse } from 'next/server'
import { getSuperadminProfile } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { setBorderReportHidden } from '@/lib/border/moderate'

// Admin-facing hide/restore for border posts, called by the
// buttons on the report detail page (/admin/reports/[id]).
// Superadmin session only — the browser has no internal token,
// so this route (not the bearer-guarded internal one) is what
// the inbox buttons use. Same core as the internal route:
// reversible only, reason required, logged to moderation_log.
export async function POST(request: NextRequest) {
  try {
    const adminProfile = await getSuperadminProfile()
    if (!adminProfile) {
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
      actor: `admin:${adminProfile.id}`,
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
