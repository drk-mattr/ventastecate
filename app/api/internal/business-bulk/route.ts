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

// Moderator-only bulk business seed. NOT a public route: it requires the
// INTERNAL_POST_TOKEN Worker secret, the same token as internal posting.
// It creates community shells only (never stores, never claims): name,
// location, category, phone, address. Existing names (normalized) are
// skipped, never duplicated — the businesses table keeps a unique
// name_normalized, so branches of one place must be seeded under distinct
// display names (e.g. a location disambiguator), not the same name twice.
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
    const items = body.businesses
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return NextResponse.json({ error: 'businesses must be an array of 1-100 items' }, { status: 400 })
    }
    const created: { name: string; id: string }[] = []
    const skipped: string[] = []
    const errors: { name: string; error: string }[] = []
    for (const item of items) {
      const name = typeof item.name === 'string' ? item.name.trim() : ''
      if (!name) { errors.push({ name: '', error: 'Name is required' }); continue }
      const nameNormalized = name.toLowerCase().replace(/\s+/g, ' ')
      const { data: existing } = await admin.from('businesses').select('id').eq('name_normalized', nameNormalized).maybeSingle()
      if (existing) { skipped.push(name); continue }
      const { data, error } = await admin.from('businesses').insert({
        name,
        name_normalized: nameNormalized,
        location: typeof item.location === 'string' && item.location.trim() ? item.location.trim() : null,
        category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : null,
        phone: typeof item.phone === 'string' && item.phone.trim() ? item.phone.trim() : null,
        address: typeof item.address === 'string' && item.address.trim() ? item.address.trim() : null,
      }).select('id').single()
      if (error || !data) errors.push({ name, error: error?.message || 'Insert failed' })
      else created.push({ name, id: data.id })
    }
    return NextResponse.json({ created, skipped, errors })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
