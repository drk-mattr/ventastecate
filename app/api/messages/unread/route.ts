import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBlockedIds, isArchivedByMe } from '@/lib/messages/safety'

/**
 * Messaging v2 Step 4 — the single shared unread-messages count,
 * computed server-side so the archive and block rules apply:
 * unread messages in threads the caller archived, or with a user
 * the caller blocked, do not count toward the header / bottom-bar
 * badges. The client unread store calls this first and falls back
 * to its old client-direct query when the route fails.
 *
 * Pre-031 the archive columns and user_blocks do not exist: the
 * flags normalize to false and a failed blocks lookup means
 * "nobody blocked", so the count matches the old behavior.
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

  const blockedIds = await getBlockedIds(admin, user.id)

  const { data: conversations, error: convError } = await admin
    .from('conversations')
    .select('id, buyer_id, seller_id, archived_by_buyer, archived_by_seller')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
  if (convError) {
    console.error('Failed to load conversations for unread count:', convError.message)
    return NextResponse.json({ error: 'No se pudo cargar el conteo' }, { status: 500 })
  }

  const visibleIds = (conversations ?? [])
    .filter((row) => {
      const otherId = row.buyer_id === user.id ? row.seller_id : row.buyer_id
      if (blockedIds.has(otherId)) return false
      return !isArchivedByMe(row, user.id)
    })
    .map((row) => row.id)

  if (visibleIds.length === 0) {
    return NextResponse.json({ unread: 0 })
  }

  const { data: unread, error: unreadError } = await admin
    .from('messages')
    .select('id')
    .in('conversation_id', visibleIds)
    .eq('read', false)
    .neq('sender_id', user.id)
  if (unreadError) {
    console.error('Failed to load unread count:', unreadError.message)
    return NextResponse.json({ error: 'No se pudo cargar el conteo' }, { status: 500 })
  }

  return NextResponse.json({ unread: unread?.length ?? 0 })
}
