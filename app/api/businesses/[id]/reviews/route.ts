// POST /api/businesses/[id]/reviews
//
// Rate + review one business shell: 1–5 stars, optional short note.
// One active review per user per business — a repeat call updates the
// caller's own review (upsert on the unique constraint). Signed-in
// only, rate-limited, plain Spanish errors. The claimed owner of the
// business cannot review their own business (403). Display-only: the
// rating feeds no score and no ranking. Pre-042 the table does not
// exist and the route answers 503.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const MAX_BODY = 1000
const NOT_ACTIVE = 'Las opiniones aún no están activadas (falta aplicar la migración 042)'

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: businessId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Inicia sesión para opinar' }, { status: 401 })
    }

    const limit = rateLimit(`business-review:${user.id}`, 10, 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Demasiados envíos, intenta más tarde' }, { status: 429 })
    }

    let body: { rating?: unknown; body?: unknown }
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const rating = typeof body.rating === 'number' ? body.rating : NaN
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Elige una calificación de 1 a 5 estrellas' }, { status: 400 })
    }
    const text = typeof body.body === 'string' ? body.body.trim() : ''
    if (text.length > MAX_BODY) {
      return NextResponse.json(
        { error: 'La opinión no puede superar 1000 caracteres' },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

    // The business must exist. Its claimed owner cannot review it.
    const { data: business, error: businessError } = await admin
      .from('businesses')
      .select('id, claimed_by')
      .eq('id', businessId)
      .single()
    if (businessError || !business) {
      if (isMissingSchema(businessError)) {
        return NextResponse.json({ error: NOT_ACTIVE }, { status: 503 })
      }
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }
    if (business.claimed_by && business.claimed_by === user.id) {
      return NextResponse.json(
        { error: 'No puedes opinar sobre tu propio negocio' },
        { status: 403 },
      )
    }

    const { data: review, error: upsertError } = await admin
      .from('business_reviews')
      .upsert(
        {
          business_id: businessId,
          user_id: user.id,
          rating,
          body: text || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id,user_id' },
      )
      .select('id, business_id, user_id, rating, body, created_at, updated_at')
      .single()
    if (upsertError || !review) {
      if (isMissingSchema(upsertError)) {
        return NextResponse.json({ error: NOT_ACTIVE }, { status: 503 })
      }
      console.error('business review upsert error:', upsertError?.message)
      return NextResponse.json({ error: 'No se pudo guardar tu opinión' }, { status: 500 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single()

    return NextResponse.json(
      {
        review: {
          ...review,
          profile: profile
            ? {
                username: profile.username,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
              }
            : undefined,
        },
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
