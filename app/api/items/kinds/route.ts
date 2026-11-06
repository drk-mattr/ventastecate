// GET /api/items/kinds?q=<text>&limit=<n>&region=<label>
//
// Kind search for discovery (§5, §8, 034C) — NOT scoped to one
// business, unlike /api/items/search (the posting type-ahead). The
// query resolves to kinds by exact canonical/alias match, then
// normalized substring suggestions; a parent kind matches its own name
// and is the broader filter, its children follow. Empty q returns the
// approved roots, most-offered first.
//
// The optional region param scopes the offering counts to that
// location (same labels as the header selector); without it the counts
// are unscoped. Public read; approved kinds and visible offerings only.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { searchKinds } from '@/lib/items/kind-search'
import { LOCATION_OPTIONS } from '@/lib/business-regions'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '12', 10) || 12, 1), 25)

  // Region is an explicit label from LOCATION_OPTIONS; anything else
  // (including a missing param) means unscoped counts.
  const region = searchParams.get('region')
  const option = region ? LOCATION_OPTIONS.find((o) => o.label === region) : undefined
  const towns = option ? option.towns : null

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

  try {
    const kinds = await searchKinds(admin, q, { towns, limit })
    return NextResponse.json({ kinds })
  } catch (e) {
    // Pre-034A guard: the tables are missing — answer 503 instead of
    // crashing. The user runs migration 034 in the SQL editor.
    const code = (e as { code?: string } | null)?.code
    if (code === '42P01' || code === 'PGRST204') {
      return NextResponse.json({ error: 'Aún no disponible, intenta más tarde' }, { status: 503 })
    }
    console.error('kinds search error:', e)
    return NextResponse.json({ error: 'No se pudo buscar' }, { status: 500 })
  }
}
