import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const REASONS = ['story_spam', 'story_offensive', 'story_prohibited', 'story_other'] as const

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

// POST /api/stories/[id]/report
//
// Report a story as spam / offensive / prohibited / other. A report
// OPENS A REVIEW in /admin/reports — it never hides the story (same
// rule as items: a single report must not remove content).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: storyId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Inicia sesión para reportar' }, { status: 401 })
    }

    const limit = rateLimit(`story-report:${user.id}`, 10, 60 * 1000)
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
        : 'story_other'

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

    const { data: story, error: storyError } = await admin
      .from('stories')
      .select('id')
      .eq('id', storyId)
      .single()
    if (storyError || !story) {
      if (isMissingSchema(storyError)) {
        return NextResponse.json({ error: 'Las historias aún no están activadas (falta aplicar la migración 040)' }, { status: 503 })
      }
      return NextResponse.json({ error: 'Historia no encontrada' }, { status: 404 })
    }

    // One open report per user per story: a repeat report is a no-op
    // success, not a second queue entry.
    const { data: existing } = await admin
      .from('reports')
      .select('id')
      .eq('story_id', storyId)
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
      story_id: storyId,
      reporter_id: user.id,
      reporter_label: profile ? `${profile.display_name} (@${profile.username})` : 'Anónimo',
      status: 'new',
    })
    if (reportError) {
      if (isMissingSchema(reportError)) {
        return NextResponse.json({ error: 'Las historias aún no están activadas (falta aplicar la migración 040)' }, { status: 503 })
      }
      console.error('story report insert error:', reportError.message)
      return NextResponse.json({ error: 'No se pudo enviar el reporte' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
