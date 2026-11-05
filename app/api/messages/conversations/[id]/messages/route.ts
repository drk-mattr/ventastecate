import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

/**
 * Messaging v2 Step 1 — server-side paginated thread messages.
 *
 * Replaces the client-direct read in app/messages/page.tsx, which
 * loaded the whole thread at once. Page 1 is the most recent
 * `limit` messages (returned oldest-first, as the page renders
 * them); page 2+ walks back through older messages. Load-more UI
 * is Step 2 — the route already supports it via ?page=.
 *
 * Auth: the caller's session. The conversation row is fetched
 * first (RLS shows it only to participants), so a non-participant
 * gets a 404, same as a missing thread.
 */
export async function GET(
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

  const { id: conversationId } = await params

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (convError) {
    console.error('Failed to load conversation:', convError.message)
    return NextResponse.json({ error: 'Failed to load conversation' }, { status: 500 })
  }
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const search = request.nextUrl.searchParams
  const page = Math.max(1, Number.parseInt(search.get('page') ?? '1', 10) || 1)
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(search.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  )

  // Fetch one extra row, newest-first, to know whether an older page exists.
  const from = (page - 1) * limit
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, read, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(from, from + limit)

  if (error) {
    console.error('Failed to load messages:', error.message)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }

  const rows = data ?? []
  const has_more = rows.length > limit
  const messages = rows.slice(0, limit).reverse()

  return NextResponse.json({
    messages,
    page,
    limit,
    has_more,
  })
}
