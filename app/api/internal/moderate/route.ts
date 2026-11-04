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

// Internal moderator endpoint, same token as community posting.
// Actions are reversible only: hide (active -> inactive) and restore
// (inactive -> active). Nothing is ever deleted here. Every action is
// logged to moderation_log with a reason, so it can be audited and reversed.
// Ambiguous cases should be flagged to Greg, not hidden unilaterally.
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
    const action = body.action
    const listingId = typeof body.listing_id === 'string' ? body.listing_id : ''
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if ((action !== 'hide' && action !== 'restore') || !listingId || !reason) {
      return NextResponse.json({ error: 'action (hide|restore), listing_id and reason are required' }, { status: 400 })
    }
    const { data: listing, error: fetchError } = await admin
      .from('listings')
      .select('id, status')
      .eq('id', listingId)
      .single()
    if (fetchError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }
    const newStatus = action === 'hide' ? 'inactive' : 'active'
    const { error: updateError } = await admin
      .from('listings')
      .update({ status: newStatus })
      .eq('id', listingId)
    if (updateError) {
      return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
    }
    // Log is best-effort: if the moderation_log table (020) has not been
    // applied yet, the hide/restore still happened and is reported as such.
    const { error: logError } = await admin.from('moderation_log').insert({
      listing_id: listingId,
      action,
      reason,
      actor: 'internal-community',
    })
    return NextResponse.json({
      id: listingId,
      previous_status: listing.status,
      status: newStatus,
      logged: !logError,
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
