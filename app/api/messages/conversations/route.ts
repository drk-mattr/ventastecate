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
 * Step 2 also returns the listing's first image (lowest
 * order_index) as listing.image_url, for the Messenger-style rows.
 * Same plain-query pattern — listing_images is public-read.
 *
 * Step 3 also returns the listing's price and status (thread
 * header) and the listing_title snapshot taken at creation, so a
 * thread stays readable after its listing is deleted (migration
 * 030, ON DELETE SET NULL). listing_title is read off the row only
 * when the column exists — pre-030 it is simply absent, and the
 * route must NOT 500 on a pre-migration database.
 *
 * NO EMBEDS — read this before adding one back. Production's
 * conversations table is missing the listing_id -> listings foreign
 * key that schema.sql declares (prod was built on a different schema
 * lineage; no migration ever creates the conversations table there),
 * so ANY embed of listings/buyer/seller 500s with PostgREST's
 * "Could not find a relationship between 'conversations' and
 * 'listings' in the schema cache". The v1 client query had the same
 * embeds and the same failure — it was just masked by the page's
 * empty state. Related rows therefore come from separate plain
 * queries and are joined in JS below. Migration 029 restores the
 * missing FKs; even after it runs, keep this route embed-free —
 * a route that works with or without the FKs is strictly safer.
 * has_more comes from fetching one extra row. No `total` here —
 * the page does not read it; Step 2 adds a proper count when
 * pagination UI lands.
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

  // Plain columns only — see the header comment. One extra row tells
  // us whether another page exists.
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
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

  const listingById = new Map<
    string,
    {
      id: string
      title: string
      price: number | null
      status: string | null
      image_url: string | null
    }
  >()
  const profileById = new Map<
    string,
    { id: string; username: string; display_name: string; avatar_url: string }
  >()
  // Unread counts without fetching message bodies: ids only.
  const unreadByConversation = new Map<string, number>()
  // Latest message per thread, from a separate plain messages query.
  const lastByConversation = new Map<string, { content: string; created_at: string }>()

  if (ids.length > 0) {
    const listingIds = [...new Set(conversations.map((c) => c.listing_id).filter(Boolean))]
    const userIds = [
      ...new Set(
        conversations.flatMap((c) => [c.buyer_id, c.seller_id]).filter(Boolean)
      ),
    ]

    const [
      { data: listings, error: listingsError },
      { data: profiles, error: profilesError },
      { data: images, error: imagesError },
    ] = await Promise.all([
      supabase.from('listings').select('id, title, price, status').in('id', listingIds),
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds),
      // First image per listing (lowest order_index) for the Step 2
      // rows. A failure here only costs thumbnails, never the list.
      supabase
        .from('listing_images')
        .select('listing_id, image_url')
        .in('listing_id', listingIds)
        .order('order_index', { ascending: true })
        .limit(500),
    ])

    if (listingsError) {
      console.error('Failed to load conversation listings:', listingsError.message)
    } else {
      const imageByListing = new Map<string, string>()
      if (imagesError) {
        console.error('Failed to load conversation listing images:', imagesError.message)
      } else {
        for (const row of images ?? []) {
          if (row.image_url && !imageByListing.has(row.listing_id)) {
            imageByListing.set(row.listing_id, row.image_url)
          }
        }
      }
      for (const row of listings ?? []) {
        listingById.set(row.id, {
          id: row.id,
          title: row.title,
          price: row.price ?? null,
          status: row.status ?? null,
          image_url: imageByListing.get(row.id) ?? null,
        })
      }
    }
    if (profilesError) {
      console.error('Failed to load conversation profiles:', profilesError.message)
    } else {
      for (const row of profiles ?? []) profileById.set(row.id, row)
    }

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
    // listing_title only exists post-migration-030; pre-030 the key
    // is absent from the row, so normalize it to null here.
    listing_title: (conv as { listing_title?: string | null }).listing_title ?? null,
    // listing_id is null once the listing is deleted (030 SET NULL);
    // listingById.get(null) is undefined, so listing is null and the
    // client falls back to listing_title.
    listing: conv.listing_id ? (listingById.get(conv.listing_id) ?? null) : null,
    buyer: profileById.get(conv.buyer_id) ?? null,
    seller: profileById.get(conv.seller_id) ?? null,
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
