import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

// POST /api/businesses/[id]/suggest-info
// Logged-in users fill in a business shell: phone, address, hours,
// category, website. Values go live instantly and each changed field is
// logged to business_contributions for attribution + history (the brief's
// recommendation — no pre-approval queue). The business name is never
// editable here; that is duplicate-merging, a separate flow.
//
// Pre-032 guard: if the contributions table (or the new columns) is not
// there yet, answer 503 instead of crashing — the user runs migration 032
// in the Supabase SQL editor after deploy.
const FIELD_LABEL: Record<string, string> = {
  phone: 'Teléfono',
  address: 'Dirección',
  hours: 'Horario',
  category: 'Categoría',
  website: 'Web',
}

const MAX_LEN: Record<string, number> = {
  phone: 40,
  address: 200,
  hours: 200,
  category: 100,
  website: 200,
}

function isMissingSchema(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  // 42P01 undefined table, 42703 undefined column, PGRST204 column not
  // found in schema cache.
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para agregar información' }, { status: 401 })

  const limit = rateLimit(`suggest-info:${user.id}`, 10, 10 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Demasiados envíos, intenta más tarde' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const values: Record<string, string> = {}
  for (const field of Object.keys(FIELD_LABEL)) {
    const raw = body[field]
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (!trimmed) continue
    if (trimmed.length > MAX_LEN[field]) {
      return NextResponse.json({ error: `${FIELD_LABEL[field]} demasiado largo` }, { status: 400 })
    }
    values[field] = trimmed
  }
  if (values.website && !/^https?:\/\//i.test(values.website) && !/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(values.website)) {
    return NextResponse.json({ error: 'Escribe una web válida, por ejemplo midominio.com' }, { status: 400 })
  }
  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: 'Escribe al menos un dato' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

  const { data: business, error: bizError } = await admin
    .from('businesses')
    .select('id, name, phone, address, hours, category, website')
    .eq('id', id)
    .single()
  if (bizError || !business) {
    if (isMissingSchema(bizError)) {
      return NextResponse.json({ error: 'Aún no disponible, intenta más tarde' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
  }

  // Probe the contributions table first: if 032 has not run yet, the
  // table is missing and nothing here can be recorded.
  const probe = await admin.from('business_contributions').select('id').limit(1)
  if (probe.error && isMissingSchema(probe.error)) {
    return NextResponse.json({ error: 'Aún no disponible, intenta más tarde' }, { status: 503 })
  }

  const changed: { field: string; oldValue: string | null; newValue: string }[] = []
  const updates: Record<string, string> = {}
  for (const [field, newValue] of Object.entries(values)) {
    const oldValue = (business as Record<string, unknown>)[field] as string | null
    if (oldValue === newValue) continue
    changed.push({ field, oldValue: oldValue ?? null, newValue })
    updates[field] = newValue
  }
  if (changed.length === 0) {
    return NextResponse.json({ success: true, updated: [] })
  }

  if (updates.website && !/^https?:\/\//i.test(updates.website)) {
    updates.website = `https://${updates.website}`
  }

  const { error: updateError } = await admin.from('businesses').update(updates).eq('id', id)
  if (updateError) {
    if (isMissingSchema(updateError)) {
      return NextResponse.json({ error: 'Aún no disponible, intenta más tarde' }, { status: 503 })
    }
    console.error('suggest-info update error:', updateError.message)
    return NextResponse.json({ error: 'No se pudo guardar la información' }, { status: 500 })
  }

  const { error: logError } = await admin.from('business_contributions').insert(
    changed.map((c) => ({
      business_id: id,
      user_id: user.id,
      field: c.field,
      old_value: c.oldValue,
      new_value: c.newValue,
    }))
  )
  if (logError) {
    // The values are already live; a missing log must not fail the
    // request, but it must be loud — attribution is the trust mechanism.
    console.error('suggest-info contribution log error:', logError.message)
  }

  return NextResponse.json({ success: true, updated: changed.map((c) => c.field) })
}
