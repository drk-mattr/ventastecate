import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MAX_LISTING_IMAGES } from '@/lib/validation'

const MAX_BYTES = 5 * 1024 * 1024

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

// Detect the image type from the file signature, not the extension.
function sniffImage(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return 'image/png'
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

// Internal listing-image upload for community posts ONLY: the listing must
// belong to the ventastecate community account, otherwise it is refused.
// Closes the gap where a user-supplied poster file had no way into the
// site's storage (anon upload to the listing-images bucket is blocked by
// RLS, and update-listing only accepts already-hosted https URLs).
// Body: { listing_id, image_base64, filename }. The file goes to the
// public listing-images bucket under community/<filename> (upsert), a
// listing_images row is added at order_index max + 1, and the public URL
// is returned. Never touches seller listings, never deletes.
export async function POST(request: NextRequest) {
  try {
    if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'Service key not configured' }, { status: 503 })
    const body = await request.json()
    const listingId = typeof body.listing_id === 'string' ? body.listing_id : ''
    const filename = typeof body.filename === 'string' ? body.filename.replace(/[^a-zA-Z0-9._-]/g, '') : ''
    const data = typeof body.image_base64 === 'string' ? body.image_base64 : ''
    if (!listingId || !filename || !data) {
      return NextResponse.json({ error: 'listing_id, filename and image_base64 are required' }, { status: 400 })
    }
    const username = process.env.COMMUNITY_USERNAME || 'ventastecate'
    const { data: profile } = await admin.from('profiles').select('id').eq('username', username).single()
    if (!profile) return NextResponse.json({ error: 'Community account not set up' }, { status: 503 })
    const { data: listing } = await admin.from('listings').select('id, user_id').eq('id', listingId).single()
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (listing.user_id !== profile.id) {
      return NextResponse.json({ error: 'Only community posts can take images here' }, { status: 403 })
    }
    const bytes = Buffer.from(data, 'base64')
    if (bytes.length === 0 || bytes.length > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be between 1 byte and 5MB' }, { status: 400 })
    }
    const contentType = sniffImage(bytes)
    if (!contentType) {
      return NextResponse.json({ error: 'Only jpeg, png or webp images are accepted' }, { status: 400 })
    }
    const { data: existing } = await admin.from('listing_images').select('order_index').eq('listing_id', listingId).order('order_index', { ascending: false }).limit(1)
    const start = (existing?.[0]?.order_index ?? -1) + 1
    if (start >= MAX_LISTING_IMAGES) {
      return NextResponse.json({ error: 'Listing already has the maximum number of images' }, { status: 400 })
    }
    const path = `community/${filename}`
    const { error: uploadError } = await admin.storage.from('listing-images').upload(path, bytes, { contentType, upsert: true })
    if (uploadError) return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    const { data: { publicUrl } } = admin.storage.from('listing-images').getPublicUrl(path)
    const { error: rowError } = await admin.from('listing_images').insert({ listing_id: listingId, image_url: publicUrl, order_index: start })
    if (rowError) return NextResponse.json({ error: `Row failed: ${rowError.message}` }, { status: 500 })
    return NextResponse.json({ success: true, url: publicUrl })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
