// POST /api/businesses/[id]/reviews/[reviewId]/report
//
// Report one business review as spam / offensive / prohibited / other.
// A report OPENS A REVIEW in /admin/reports — it never hides the
// review (same rule as items and stories: a single report must not
// remove content).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const REASONS = [
  'business_review_spam',
  'business_review_offensive',
  'business_review_prohibited',
  'business_review_other',
] as const

const NOT_ACTIVE = 'Las opiniones aún no están activadas (falta aplicar la migración 042)'

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
) {
  try {
    const { id: businessId, reviewId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Inicia sesión para reportar' }, { status: 401 })
    }

    const limit = rateLimit(`business-review-report:${user.id}`, 10, 60 * 1000)
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
        : 'business_review_other'

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

    const { data: review, error: reviewError } = await admin
      .from('business_reviews')
      .select('id, business_id')
      .eq('id', reviewId)
      .single()
    if (reviewError || !review || review.business_id !== businessId) {
      if (isMissingSchema(reviewError)) {
        return NextResponse.json({ error: NOT_ACTIVE }, { status: 503 })
      }
      return NextResponse.json({ error: 'Opinión no encontrada' }, { status: 404 })
    }

    // One open report per user per review: a repeat report is a
    // no-op success, not a second queue entry.
    const { data: existing } = await admin
      .from('reports')
      .select('id')
      .eq('business_review_id', reviewId)
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
      business_review_id: reviewId,
      reporter_id: user.id,
      reporter_label: profile ? `${profile.display_name} (@${profile.username})` : 'Anónimo',
      status: 'new',
    })
    if (reportError) {
      if (isMissingSchema(reportError)) {
        return NextResponse.json({ error: NOT_ACTIVE }, { status: 503 })
      }
      console.error('business review report insert error:', reportError.message)
      return NextResponse.json({ error: 'No se pudo enviar el reporte' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
