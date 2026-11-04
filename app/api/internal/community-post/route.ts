import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCategoriesForType } from '@/lib/categories'

function authorized(request: NextRequest): boolean {
  const expected = process.env.INTERNAL_POST_TOKEN
  if (!expected) return false
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return false
  const token = header.slice('Bearer '.length)
  // Constant-time-ish comparison for equal-length strings.
  if (token.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

// Internal community posting endpoint. NOT a public route: it requires the
// INTERNAL_POST_TOKEN Worker secret, and it only posts news/events under
// the dedicated community account. It is not tied to any personal login.
// Setup (Greg): create the community account via /signup, set
// INTERNAL_POST_TOKEN as a Worker secret, and optionally set
// COMMUNITY_USERNAME (default: ventastecate).
export async function POST(request: NextRequest) {
  try {
    if (!authorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Service key not configured' }, { status: 503 })
    }
    const body = await request.json()
    const listingType = body.listing_type
    if (listingType !== 'news' && listingType !== 'event') {
      return NextResponse.json({ error: 'Only news and event posts are allowed via this endpoint' }, { status: 400 })
    }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const category = typeof body.category === 'string' ? body.category.trim() : ''
    const location = typeof body.location === 'string' ? body.location.trim() : ''
    const source = typeof body.source === 'string' ? body.source.trim() : ''
    if (title.length < 3 || title.length > 120) {
      return NextResponse.json({ error: 'Title must be 3-120 characters' }, { status: 400 })
    }
    if (description.length < 1 || description.length > 5000) {
      return NextResponse.json({ error: 'Description must be 1-5000 characters' }, { status: 400 })
    }
    if (!getCategoriesForType(listingType).includes(category)) {
      return NextResponse.json({ error: 'Invalid category for this type' }, { status: 400 })
    }
    if (!location) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 })
    }
    if (!source) {
      return NextResponse.json({ error: 'Source is required for community posts' }, { status: 400 })
    }
    const username = process.env.COMMUNITY_USERNAME || 'ventastecate'
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Community account not set up' }, { status: 503 })
    }
    const fullDescription = `${description}\n\nFuente: ${source}`
    const { data: listing, error: insertError } = await admin
      .from('listings')
      .insert({
        user_id: profile.id,
        title,
        description: fullDescription,
        price: 0,
        category,
        location,
        listing_type: listingType,
        status: 'active',
        metadata: { source, posted_via: 'internal-community' },
      })
      .select('id')
      .single()
    if (insertError || !listing) {
      return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
    }
    return NextResponse.json({ id: listing.id, url: `/listings/${listing.id}` }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
