import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCategoriesForType } from '@/lib/categories'
import { isCardColorId } from '@/lib/listings/card-colors'
import { MAX_LISTING_IMAGES } from '@/lib/validation'

function authorized(request: NextRequest): boolean {
  const expected = process.env.INTERNAL_POST_TOKEN
  if (!expected) return false
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return false
  const token = header.slice('Bearer '.length)
  if (token.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

// Internal update for community posts ONLY: the listing must belong to the
// ventastecate community account, otherwise it is refused. Used to convert
// a news post to an event (and vice versa), fix its category, change the
// title-card color, and attach poster images — never to touch seller
// listings, and never to delete.
export async function POST(request: NextRequest) {
  try {
    if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'Service key not configured' }, { status: 503 })
    const body = await request.json()
    const listingId = typeof body.listing_id === 'string' ? body.listing_id : ''
    if (!listingId) return NextResponse.json({ error: 'listing_id is required' }, { status: 400 })
    const username = process.env.COMMUNITY_USERNAME || 'ventastecate'
    const { data: profile } = await admin.from('profiles').select('id').eq('username', username).single()
    if (!profile) return NextResponse.json({ error: 'Community account not set up' }, { status: 503 })
    const { data: listing } = await admin.from('listings').select('id, user_id').eq('id', listingId).single()
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (listing.user_id !== profile.id) return NextResponse.json({ error: 'Only community posts can be updated here' }, { status: 403 })
    const updates: Record<string, unknown> = {}
    if (body.listing_type === 'news' || body.listing_type === 'event') {
      const category = typeof body.category === 'string' ? body.category.trim() : ''
      if (category && !getCategoriesForType(body.listing_type).includes(category)) {
        return NextResponse.json({ error: 'Invalid category for this type' }, { status: 400 })
      }
      updates.listing_type = body.listing_type
      if (category) updates.category = category
    }
    // Title-card color (A6): validated against the curated palette —
    // an unknown value is ignored, never stored.
    if (isCardColorId(body.card_color)) updates.card_color = body.card_color
    if (Object.keys(updates).length) {
      const { error } = await admin.from('listings').update(updates).eq('id', listingId)
      if (error) return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
    }
    const rawImages: unknown[] = Array.isArray(body.image_urls) ? body.image_urls : []
    const imageUrls = rawImages.filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, MAX_LISTING_IMAGES)
    if (imageUrls.length) {
      const { data: existing } = await admin.from('listing_images').select('order_index').eq('listing_id', listingId).order('order_index', { ascending: false }).limit(1)
      const start = (existing?.[0]?.order_index ?? -1) + 1
      const { error: imgError } = await admin.from('listing_images').insert(
        imageUrls.map((image_url, i) => ({ listing_id: listingId, image_url, order_index: start + i }))
      )
      if (imgError) return NextResponse.json({ error: 'Failed to attach image' }, { status: 500 })
    }
    return NextResponse.json({ success: true, url: `/listings/${listingId}` })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
