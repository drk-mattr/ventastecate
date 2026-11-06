import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/businesses/[id]/flag-contribution
// Any logged-in user can flag a contributed value as wrong ("¿Esto está
// mal?"). Flagging restores the field's previous value (or blank, if it
// had none) — but only when the current value is still the flagged one,
// so a later correction is never clobbered — and files a report for the
// moderator, who can re-apply or dismiss it from the reports inbox.
const FIELD_LABEL: Record<string, string> = {
  phone: 'Teléfono',
  address: 'Dirección',
  hours: 'Horario',
  category: 'Categoría',
  website: 'Web',
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para reportar' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const contributionId = body.contribution_id
  if (typeof contributionId !== 'string' || !contributionId) {
    return NextResponse.json({ error: 'Falta el aporte' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

  const { data: contribution, error: contribError } = await admin
    .from('business_contributions')
    .select('id, business_id, user_id, field, old_value, new_value, flagged_at')
    .eq('id', contributionId)
    .eq('business_id', id)
    .single()
  if (contribError || !contribution) {
    return NextResponse.json({ error: 'Aporte no encontrado' }, { status: 404 })
  }
  if (contribution.flagged_at) {
    return NextResponse.json({ success: true, alreadyFlagged: true })
  }

  const { data: business } = await admin
    .from('businesses')
    .select('id, name, phone, address, hours, category, website')
    .eq('id', id)
    .single()
  if (!business) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  // Revert only if nobody has changed the value since this contribution.
  const current = (business as Record<string, unknown>)[contribution.field] as string | null
  let reverted = false
  if (current === contribution.new_value) {
    const { error: revertError } = await admin
      .from('businesses')
      .update({ [contribution.field]: contribution.old_value ?? null })
      .eq('id', id)
    if (revertError) {
      console.error('flag-contribution revert error:', revertError.message)
      return NextResponse.json({ error: 'No se pudo revertir el dato' }, { status: 500 })
    }
    reverted = true
  }

  const { error: flagError } = await admin
    .from('business_contributions')
    .update({ flagged_at: new Date().toISOString(), flagged_by: user.id })
    .eq('id', contributionId)
  if (flagError) console.error('flag-contribution mark error:', flagError.message)

  const { data: reporter } = await admin
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single()
  const reporterLabel = reporter
    ? `${reporter.display_name} (@${reporter.username})`
    : 'Usuario'
  const { data: contributor } = contribution.user_id
    ? await admin.from('profiles').select('username').eq('id', contribution.user_id).single()
    : { data: null }
  const description = [
    `Dato marcado como incorrecto en "${business.name}".`,
    `Campo: ${FIELD_LABEL[contribution.field] || contribution.field}`,
    `Valor reportado: ${contribution.new_value}`,
    `Valor anterior: ${contribution.old_value ?? '(vacío)'}`,
    reverted ? 'El valor se revirtió al anterior.' : 'El valor ya había cambiado, no se revirtió.',
    `Aporte de: ${contributor ? `@${contributor.username}` : 'desconocido'}`,
  ].join('\n')
  await admin.from('reports').insert({
    type: 'business_contribution_flag',
    description,
    business_id: id,
    reporter_id: user.id,
    reporter_label: reporterLabel,
    status: 'new',
  })

  return NextResponse.json({ success: true, reverted })
}
