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
 *
 * Query-shape rule (learned the hard way, PR #61): the main select
 * uses ONLY the embed shape the v1 client query already proved
 * (listing/buyer/seller). The first version of this route also
 * embedded `messages` with `.order(..., { foreignTable: 'messages' })`,
 * `.limit(1, { foreignTable: 'messages' })` and `{ count: 'exact' }`
 * — the only such usage anywhere in the codebase — and the route
 * 500'd live for every signed-in user while the page silently
 * rendered its empty state. last_message comes from a separate
 * plain messages query instead; has_more from fetching one extra
 * row. No `total` here — the page does not read it; Step 2 adds a
 * proper count when pagination UI lands.
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

  // One extra row tells us whether another page exists.
  const { data, error } = await supabase
    .from('conversations')
    .select(
      `
        *,
        listing:listings(id, title),
        buyer:buyer_id(id, username, display_name, avatar_url),
        seller:seller_id(id, username, display_name, avatar_url)
      `
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('updated_at', { ascending: false })
    .range(from, from + limit)

  if (error) {
    console.error('Failed to load conversations:', error.message)
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
  }

  const rows = data ?? []
  const has_more = rows.length > limit
  const conversations = rows.slice(0, limit)
  const ids = conversations.map((c) => c.id)

  // Unread counts without fetching message bodies: ids only.
  const unreadByConversation = new Map<string, number>()
  // Latest message per thread, from a separate plain messages query.
  const lastByConversation = new Map<string, { content: string; created_at: string }>()
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

    // Newest first, capped — the latest row per thread is what we keep.
    const { data: latest, error: latestError } = await supabase
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
      .limit(500)

    if (latestError) {
      console.error('Failed to load last messages:', latestError.message)
    } else {
      for (const row of latest ?? []) {
        if (!lastByConversation.has(row.conversation_id)) {
          lastByConversation.set(row.conversation_id, {
            content: row.content,
            created_at: row.created_at,
          })
        }
      }
    }
  }

  const shaped = conversations.map((conv) => ({
    ...conv,
    unread_count: unreadByConversation.get(conv.id) ?? 0,
    last_message: lastByConversation.get(conv.id) ?? null,
  }))

  return NextResponse.json({
    conversations: shaped,
    page,
    limit,
    has_more,
  })
}
