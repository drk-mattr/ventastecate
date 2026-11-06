import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { messageBlockSchema } from '@/lib/validation'
import { isMissingObjectError } from '@/lib/messages/safety'

/**
 * Messaging v2 Step 4 — user blocks.
 *
 * Blocking hides the thread for the blocker (the conversations
 * route filters it out of both views) and the database triggers
 * from migration 031 stop the blocked user from starting a new
 * thread or sending in an existing one. Blocking never deletes
 * history; unblocking restores normal behavior.
 *
 * All access goes through this route with the service-role client:
 * user_blocks has no permissive RLS policies, so the client can
 * never read or write it directly.
 *
 * Pre-031 the user_blocks table does not exist: GET returns an
 * empty list, POST/DELETE answer 503 migration_pending.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Error de configuración' }, { status: 503 })
  }

  const { data, error } = await admin
    .from('user_blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false })
  if (error) {
    // Pre-031: the table does not exist yet — nobody is blocked.
    if (isMissingObjectError(error)) {
      return NextResponse.json({ blocked: [] })
    }
    console.error('Failed to load blocks:', error.message)
    return NextResponse.json({ error: 'No se pudieron cargar los bloqueos' }, { status: 500 })
  }

  const ids = (data ?? []).map((r) => r.blocked_id as string)
  const blockedById = new Map<string, string>()
  for (const row of data ?? []) {
    blockedById.set(row.blocked_id as string, row.created_at as string)
  }

  let profiles: { id: string; username: string; display_name: string; avatar_url: string | null }[] = []
  if (ids.length > 0) {
    const { data: rows } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ids)
    profiles = (rows ?? []) as typeof profiles
  }

  return NextResponse.json({
    blocked: profiles.map((p) => ({ ...p, blocked_at: blockedById.get(p.id) ?? null })),
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = messageBlockSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  if (parsed.data.userId === user.id) {
    return NextResponse.json({ error: 'No puedes bloquearte a ti mismo' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Error de configuración' }, { status: 503 })
  }

  const { error } = await admin.from('user_blocks').upsert(
    { blocker_id: user.id, blocked_id: parsed.data.userId },
    { onConflict: 'blocker_id,blocked_id' }
  )
  if (error) {
    if (isMissingObjectError(error)) {
      return NextResponse.json(
        { error: 'migration_pending', message: 'Esta función aún no está disponible.' },
        { status: 503 }
      )
    }
    console.error('Failed to block user:', error.message)
    return NextResponse.json({ error: 'No se pudo bloquear al usuario' }, { status: 500 })
  }

  return NextResponse.json({ success: true, blocked: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = messageBlockSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Error de configuración' }, { status: 503 })
  }

  const { error } = await admin
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', parsed.data.userId)
  if (error) {
    if (isMissingObjectError(error)) {
      return NextResponse.json(
        { error: 'migration_pending', message: 'Esta función aún no está disponible.' },
        { status: 503 }
      )
    }
    console.error('Failed to unblock user:', error.message)
    return NextResponse.json({ error: 'No se pudo desbloquear al usuario' }, { status: 500 })
  }

  return NextResponse.json({ success: true, blocked: false })
}
