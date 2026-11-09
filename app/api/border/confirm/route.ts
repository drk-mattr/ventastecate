import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const voteSchema = z.object({
  report_id: z.string().uuid(),
  // Waze's mechanism, the cheapest verification that exists:
  // "¿Sigue así?" — confirma / niega. 3 confirmations in 30 min
  // outrank a single fresh report; 2 denials drop a report out
  // of the estimate immediately (lib/border/estimate.ts).
  vote: z.enum(['confirma', 'niega']),
})

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

// POST /api/border/confirm — a signed-in user confirms or denies
// one border report. One vote per user per report (unique
// constraint); voting again replaces the previous vote.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Inicia sesión para votar' }, { status: 401 })
    }

    const limit = rateLimit(`border-vote:${user.id}`, 30, 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Espera un momento antes de votar de nuevo' },
        { status: 429 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const parsed = voteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const { report_id, vote } = parsed.data

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }

    const { data: report, error: reportError } = await admin
      .from('border_line_reports')
      .select('id')
      .eq('id', report_id)
      .maybeSingle()
    if (reportError) {
      if (isMissingSchema(reportError)) {
        return NextResponse.json(
          { error: 'La garita aún no está activada (falta aplicar la migración 049)' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: 'No se pudo votar' }, { status: 500 })
    }
    if (!report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    const { error: upsertError } = await admin.from('border_line_votes').upsert(
      { report_id, user_id: user.id, vote },
      { onConflict: 'report_id,user_id' },
    )
    if (upsertError) {
      if (isMissingSchema(upsertError)) {
        return NextResponse.json(
          { error: 'La garita aún no está activada (falta aplicar la migración 049)' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: 'No se pudo votar' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
