import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { messageArchiveSchema } from '@/lib/validation'
import { isMissingObjectError } from '@/lib/messages/safety'

/**
 * Messaging v2 Step 4 — archive / unarchive a thread, per
 * participant. Archiving hides the thread from the caller's list
 * only; the other participant is unaffected, and unarchiving
 * restores it.
 *
 * Server route (not client-direct): there is NO UPDATE policy on
 * conversations (see 028), so the client cannot update the row.
 * The route verifies participation, then updates the caller's own
 * archive flag with the service-role client.
 *
 * Pre-031 the archived_by_* columns do not exist: the update fails
 * with 42703 and the route answers 503 migration_pending, so the
 * UI can say "not available yet" instead of crashing.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = messageArchiveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Error de configuración' }, { status: 503 })
  }

  const { id } = await params
  const { data: conv, error: convError } = await admin
    .from('conversations')
    .select('id, buyer_id, seller_id')
    .eq('id', id)
    .maybeSingle()
  if (convError || !conv) {
    return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
  }
  if (conv.buyer_id !== user.id && conv.seller_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const column = conv.buyer_id === user.id ? 'archived_by_buyer' : 'archived_by_seller'
  const { error } = await admin
    .from('conversations')
    .update({ [column]: parsed.data.archived })
    .eq('id', id)
  if (error) {
    if (isMissingObjectError(error)) {
      return NextResponse.json(
        { error: 'migration_pending', message: 'Esta función aún no está disponible.' },
        { status: 503 }
      )
    }
    console.error('Failed to archive conversation:', error.message)
    return NextResponse.json({ error: 'No se pudo archivar la conversación' }, { status: 500 })
  }

  return NextResponse.json({ success: true, archived: parsed.data.archived })
}
