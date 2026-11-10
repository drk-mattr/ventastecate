import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import {
  DIRECTION_LABELS,
  LANE_LABELS,
  formatAge,
  formatWait,
} from '@/lib/border/estimate'

const REASONS = ['border_spam', 'border_offensive', 'border_other'] as const

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

// POST /api/border/[id]/report
//
// Flag a border post as spam / offensive / other. A report OPENS
// A REVIEW in /admin/reports — it never hides the post (same
// rule as stories and item comments: a single report must not
// remove content). "Reportar" (wrong/offensive) and "niega" (the
// wait is no longer true) are two different buttons with two
// different meanings; this route is only the first one.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: reportId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Inicia sesión para reportar' }, { status: 401 })
    }

    const limit = rateLimit(`border-flag:${user.id}`, 10, 60 * 1000)
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
        : 'border_other'

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

    const { data: post, error: postError } = await admin
      .from('border_line_reports')
      .select('id, lane, direction, wait_minutes, status, created_at')
      .eq('id', reportId)
      .maybeSingle()
    if (postError || !post) {
      if (isMissingSchema(postError)) {
        return NextResponse.json(
          { error: 'La garita aún no está activada (falta aplicar la migración 049)' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    // One open report per user per post: a repeat flag is a
    // no-op success, not a second queue entry.
    const { data: existing } = await admin
      .from('reports')
      .select('id')
      .eq('border_report_id', reportId)
      .eq('reporter_id', user.id)
      .eq('status', 'new')
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ success: true, already: true })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single()

    // The description carries the post's context so the
    // moderator sees what was flagged without opening the page.
    const ageMinutes = Math.max(
      0,
      Math.floor((Date.now() - new Date(post.created_at).getTime()) / 60000),
    )
    const description =
      `${LANE_LABELS[post.lane as keyof typeof LANE_LABELS]} · ` +
      `${DIRECTION_LABELS[post.direction as keyof typeof DIRECTION_LABELS]} · ` +
      `${formatWait(post.wait_minutes)} · ${formatAge(ageMinutes)} · ` +
      `${post.status === 'ya_cruce' ? 'Ya cruzó' : 'En la fila'}`

    const { error: reportError } = await admin.from('reports').insert({
      type: reason,
      description,
      border_report_id: reportId,
      reporter_id: user.id,
      reporter_label: profile ? `${profile.display_name} (@${profile.username})` : 'Anónimo',
      status: 'new',
    })
    if (reportError) {
      if (isMissingSchema(reportError)) {
        return NextResponse.json(
          { error: 'Aún no disponible, intenta más tarde' },
          { status: 503 },
        )
      }
      console.error('border report insert error:', reportError.message)
      return NextResponse.json({ error: 'No se pudo enviar el reporte' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
