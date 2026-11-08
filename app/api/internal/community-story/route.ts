import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

// Internal community story endpoint. NOT a public route: it requires
// the INTERNAL_POST_TOKEN Worker secret, the same token as internal
// posting, and it only posts under the dedicated community account.
// This is how @ventastecate seeds the first stories (news/events).
//
// Body: { image_url?, photos?, caption?, listing_id?, business_id? }
// - image_url: an https URL already hosted (e.g. a listing/poster image)
// - photos: [{ filename, data }] base64, like business-photos — the
//   first photo is uploaded to stories/<communityId>/ and used.
// - caption: optional typed text (max 140 chars), same as the public route.
// One of image_url / photos is required.
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

    const listingId = typeof body.listing_id === 'string' && body.listing_id ? body.listing_id : null
    const businessId = typeof body.business_id === 'string' && body.business_id ? body.business_id : null

    const caption = typeof body.caption === 'string' ? body.caption.trim() : ''
    if (caption.length > 140) {
      return NextResponse.json({ error: 'caption too long (max 140 characters)' }, { status: 400 })
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

    let imageUrl = typeof body.image_url === 'string' && /^https?:\/\//.test(body.image_url) ? body.image_url : ''
    if (!imageUrl) {
      const photos = Array.isArray(body.photos) ? body.photos : []
      const first = photos[0]
      const filename = typeof first?.filename === 'string' ? first.filename.replace(/[^a-zA-Z0-9._-]/g, '') : ''
      const data = typeof first?.data === 'string' ? first.data : ''
      if (!filename || !data) {
        return NextResponse.json({ error: 'image_url or photos[0] (filename + data) required' }, { status: 400 })
      }
      const path = `stories/${profile.id}/${Date.now()}-${filename}`
      const { error: uploadError } = await admin.storage.from('listing-images').upload(path, Buffer.from(data, 'base64'), { contentType: 'image/jpeg' })
      if (uploadError) {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
      }
      imageUrl = admin.storage.from('listing-images').getPublicUrl(path).data.publicUrl
    }

    if (listingId) {
      const { data } = await admin.from('listings').select('id').eq('id', listingId).eq('status', 'active').maybeSingle()
      if (!data) return NextResponse.json({ error: 'Listing not found' }, { status: 400 })
    }
    if (businessId) {
      const { data } = await admin.from('businesses').select('id').eq('id', businessId).maybeSingle()
      if (!data) return NextResponse.json({ error: 'Business not found' }, { status: 400 })
    }

    const { data: story, error: insertError } = await admin.from('stories').insert({
      author_id: profile.id,
      image_url: imageUrl,
      caption: caption || null,
      listing_id: listingId,
      business_id: businessId,
    }).select('id, expires_at').single()
    if (insertError || !story) {
      if (isMissingSchema(insertError)) {
        return NextResponse.json({ error: 'Stories table not set up (migration 040 not applied)' }, { status: 503 })
      }
      return NextResponse.json({ error: 'Failed to create story' }, { status: 500 })
    }
    return NextResponse.json({ id: story.id, image_url: imageUrl, expires_at: story.expires_at }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
