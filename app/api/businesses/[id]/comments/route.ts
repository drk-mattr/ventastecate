// POST /api/businesses/[id]/comments — comment on one business.
// DELETE /api/businesses/[id]/comments/[commentId] lives in its own
// route file next to this one.
//
// A business comment is a short public note on the business itself —
// a general question or note ("¿abren los domingos?"), not a rating
// and not talk about one offering. It feeds no score. Signed-in
// only, rate-limited, plain Spanish errors. Pre-053 the table does
// not exist and the route answers 503 (the page renders the feed
// without the composer until then).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const MAX_BODY = 1000
const NOT_ACTIVE = 'Los comentarios aún no están activados (falta aplicar la migración 053)'

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
      return NextResponse.json({ error: 'Inicia sesión para comentar' }, { status: 401 })
    }

    const limit = rateLimit(`business-comment:${user.id}`, 10, 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Demasiados envíos, intenta más tarde' }, { status: 429 })
    }

    let body: { body?: unknown }
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const text = typeof body.body === 'string' ? body.body.trim() : ''
    if (text.length < 1) {
      return NextResponse.json({ error: 'Escribe un comentario' }, { status: 400 })
    }
    if (text.length > MAX_BODY) {
      return NextResponse.json(
        { error: 'El comentario no puede superar 1000 caracteres' },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

    // The business must exist — no comments on a shell that is gone.
    const { data: business, error: businessError } = await admin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .single()
    if (businessError || !business) {
      if (isMissingSchema(businessError)) {
        return NextResponse.json({ error: NOT_ACTIVE }, { status: 503 })
      }
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }

    const { data: comment, error: insertError } = await admin
      .from('business_comments')
      .insert({ business_id: businessId, author_id: user.id, body: text })
      .select('id, business_id, author_id, body, created_at')
      .single()
    if (insertError || !comment) {
      if (isMissingSchema(insertError)) {
        return NextResponse.json({ error: NOT_ACTIVE }, { status: 503 })
      }
      console.error('business comment insert error:', insertError?.message)
      return NextResponse.json({ error: 'No se pudo publicar el comentario' }, { status: 500 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single()

    return NextResponse.json(
      {
        comment: {
          ...comment,
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
