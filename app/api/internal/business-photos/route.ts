import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

// Moderator-only business photo upload. NOT a public route: it requires
// the INTERNAL_POST_TOKEN Worker secret, the same token as internal
// posting. Body: { business_id, photos: [{ filename, data }] } where data
// is base64 image bytes. Photos go to the public listing-images bucket
// under businesses/<id>/, rows go to business_images, and the first
// photo becomes businesses.image_url when no main photo is set yet.
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
    const businessId = typeof body.business_id === 'string' ? body.business_id : ''
    const photos = Array.isArray(body.photos) ? body.photos : []
    if (!businessId || photos.length === 0 || photos.length > 20) {
      return NextResponse.json({ error: 'business_id and 1-20 photos required' }, { status: 400 })
    }
    const { data: business } = await admin.from('businesses').select('id, image_url').eq('id', businessId).maybeSingle()
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    const uploaded: string[] = []
    for (let i = 0; i < photos.length; i++) {
      const filename = typeof photos[i]?.filename === 'string' ? photos[i].filename.replace(/[^a-zA-Z0-9._-]/g, '') : ''
      const data = typeof photos[i]?.data === 'string' ? photos[i].data : ''
      if (!filename || !data) continue
      const path = `businesses/${businessId}/${Date.now()}-${i}-${filename}`
      const { error: uploadError } = await admin.storage.from('listing-images').upload(path, Buffer.from(data, 'base64'), { contentType: 'image/jpeg' })
      if (uploadError) {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
      }
      const { data: { publicUrl } } = admin.storage.from('listing-images').getPublicUrl(path)
      const { error: rowError } = await admin.from('business_images').insert({ business_id: businessId, image_url: publicUrl, order_index: i })
      if (rowError) {
        return NextResponse.json({ error: `Row failed: ${rowError.message}` }, { status: 500 })
      }
      uploaded.push(publicUrl)
    }
    if (uploaded.length > 0 && !business.image_url) {
      await admin.from('businesses').update({ image_url: uploaded[0] }).eq('id', businessId)
    }
    return NextResponse.json({ uploaded })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
