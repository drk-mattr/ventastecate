// POST /api/businesses/[id]/comments/[commentId]/report
//
// Report one business comment as spam / offensive / prohibited / other.
// A report OPENS A REVIEW in /admin/reports — it never hides the
// comment (same rule as items and stories: a single report must not
// remove content).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const REASONS = [
  'business_comment_spam',
  'business_comment_offensive',
  'business_comment_prohibited',
  'business_comment_other',
] as const

const NOT_ACTIVE = 'Los comentarios aún no están activados (falta aplicar la migración 053)'

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const { id: businessId, commentId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Inicia sesión para reportar' }, { status: 401 })
    }

    const limit = rateLimit(`business-comment-report:${user.id}`, 10, 60 * 1000)
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
        : 'business_comment_other'

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

    const { data: comment, error: commentError } = await admin
      .from('business_comments')
      .select('id, business_id')
      .eq('id', commentId)
      .single()
    if (commentError || !comment || comment.business_id !== businessId) {
      if (isMissingSchema(commentError)) {
        return NextResponse.json({ error: NOT_ACTIVE }, { status: 503 })
      }
      return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 })
    }

    // One open report per user per comment: a repeat report is a
    // no-op success, not a second queue entry.
    const { data: existing } = await admin
      .from('reports')
      .select('id')
      .eq('business_comment_id', commentId)
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

    const { error: reportError } = await admin.from('reports').insert({
      type: reason,
      description: null,
      business_comment_id: commentId,
      reporter_id: user.id,
      reporter_label: profile ? `${profile.display_name} (@${profile.username})` : 'Anónimo',
      status: 'new',
    })
    if (reportError) {
      if (isMissingSchema(reportError)) {
        return NextResponse.json({ error: NOT_ACTIVE }, { status: 503 })
      }
      console.error('business comment report insert error:', reportError.message)
      return NextResponse.json({ error: 'No se pudo enviar el reporte' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
