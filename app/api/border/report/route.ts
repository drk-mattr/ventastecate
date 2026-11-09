import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const reportSchema = z.object({
  // Only the three lanes that exist at Tecate — there is NO
  // SENTRI / Ready Lane here, so they are never offered.
  lane: z.enum(['auto', 'peatonal', 'comercial']),
  // CBP measures into the US only; 'sur' waits exist only as
  // community reports, and are always labeled that way.
  direction: z.enum(['norte', 'sur']).default('norte'),
  wait_minutes: z.number().int().min(0).max(360),
  // en_fila = minutes waited so far (a lower bound);
  // ya_cruce = total minutes (the real wait).
  status: z.enum(['en_fila', 'ya_cruce']),
  note: z.string().max(280).optional(),
  photo_url: z.string().url().optional(),
})

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

// POST /api/border/report — a signed-in user reports the line.
// Body: { lane, direction?, wait_minutes, status, note?, photo_url? }
// One report per user per lane+direction per 15 minutes (DB count):
// a second report inside the window REPLACES the first (people
// update as the line moves) instead of stacking. The estimate
// itself filters outliers and denied reports at read time
// (lib/border/estimate.ts) — this route stores everything.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Inicia sesión para reportar la fila' },
        { status: 401 },
      )
    }

    const limit = rateLimit(`border-report:${user.id}`, 10, 15 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Espera un momento antes de reportar de nuevo' },
        { status: 429 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const parsed = reportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const { lane, direction, wait_minutes, status, note, photo_url } = parsed.data

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }

    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: existing, error: existingError } = await admin
      .from('border_line_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('lane', lane)
      .eq('direction', direction)
      .gte('created_at', fifteenMinAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existingError) {
      if (isMissingSchema(existingError)) {
        return NextResponse.json(
          { error: 'La garita aún no está activada (falta aplicar la migración 049)' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: 'No se pudo guardar el reporte' }, { status: 500 })
    }

    if (existing) {
      // Replace: refresh the numbers and the timestamp, and drop
      // the old confirm/deny votes — they verified the previous
      // reading, not this one.
      const { error: voteError } = await admin
        .from('border_line_votes')
        .delete()
        .eq('report_id', existing.id)
      if (voteError) {
        return NextResponse.json({ error: 'No se pudo guardar el reporte' }, { status: 500 })
      }
      const { error: updateError } = await admin
        .from('border_line_reports')
        .update({
          wait_minutes,
          status,
          note: note?.trim() || null,
          photo_url: photo_url || null,
          created_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      if (updateError) {
        return NextResponse.json({ error: 'No se pudo guardar el reporte' }, { status: 500 })
      }
      return NextResponse.json({ id: existing.id, replaced: true }, { status: 200 })
    }

    const { data: report, error: insertError } = await admin
      .from('border_line_reports')
      .insert({
        user_id: user.id,
        lane,
        direction,
        wait_minutes,
        status,
        note: note?.trim() || null,
        photo_url: photo_url || null,
      })
      .select('id')
      .single()
    if (insertError || !report) {
      if (isMissingSchema(insertError)) {
        return NextResponse.json(
          { error: 'La garita aún no está activada (falta aplicar la migración 049)' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: 'No se pudo guardar el reporte' }, { status: 500 })
    }
    return NextResponse.json({ id: report.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
