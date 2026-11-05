import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

/**
 * Messaging v2 Step 1 — server-side conversation list.
 *
 * Replaces the client-direct read in app/messages/page.tsx, which
 * fetched EVERY message body of EVERY conversation on every load
 * just to compute unread counts. This route returns, per thread:
 * the listing + both participants (same shape the page already
 * renders), an unread_count, and the latest message as last_message
 * (foundation for the Step 2 Messenger-style rows; the v1 page
 * does not render it yet).
 *
 * Auth: the caller's session; RLS + the buyer/seller filter mean a
 * user can only ever list their own threads.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(params.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  )
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count, error } = await supabase
    .from('conversations')
    .select(
      `
        *,
        listing:listings(id, title),
        buyer:buyer_id(id, username, display_name, avatar_url),
        seller:seller_id(id, username, display_name, avatar_url),
        messages(content, created_at)
      `,
      { count: 'exact' }
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })
    .order('created_at', { foreignTable: 'messages', ascending: false })
    .limit(1, { foreignTable: 'messages' })
    .range(from, to)

  if (error) {
    console.error('Failed to load conversations:', error.message)
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
  }

  const conversations = data ?? []
  const ids = conversations.map((c) => c.id)

  // Unread counts without fetching message bodies: ids only.
  const unreadByConversation = new Map<string, number>()
  if (ids.length > 0) {
    const { data: unread, error: unreadError } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', ids)
      .eq('read', false)
      .neq('sender_id', user.id)

    if (unreadError) {
      console.error('Failed to load unread counts:', unreadError.message)
    } else {
      for (const row of unread ?? []) {
        unreadByConversation.set(
          row.conversation_id,
          (unreadByConversation.get(row.conversation_id) ?? 0) + 1
        )
      }
    }
  }

  const shaped = conversations.map((conv) => {
    const { messages: embedded, ...rest } = conv
    const last = Array.isArray(embedded) ? embedded[0] : null
    return {
      ...rest,
      unread_count: unreadByConversation.get(conv.id) ?? 0,
      last_message: last ?? null,
    }
  })

  return NextResponse.json({
    conversations: shaped,
    page,
    limit,
    total: count ?? 0,
    has_more: (count ?? 0) > page * limit,
  })
}
