import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { validateOverlays } from '@/lib/stories/validate-overlays'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const STORY_CAPTION_MAX = 140

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

// POST /api/stories — a signed-in user posts their own story image.
// Body: { image: "data:image/jpeg;base64,...", filename?, caption?, overlays?, listing_id?, business_id? }
// caption is optional typed text (max 140 chars, emojis included) shown
// as an overlay on the photo in the viewer (migration 045).
// overlays is an optional array (max 5) of placeable text/emoji stickers
// (migration 046): each { id, kind:'text', text ≤60, x, y 0–1, scale
// 0.5–3, rotation -180–180 }. If both are sent, overlays win in the
// viewer (the caption is stored but not shown).
// The image is compressed client-side (same helper as the posting form)
// before it gets here. Upload goes to the public listing-images bucket
// under stories/<userId>/, the row goes to stories (migration 040).
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Inicia sesión para publicar una historia' }, { status: 401 })
    }

    const limit = rateLimit(`story:${user.id}`, 10, 24 * 60 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Llegaste al límite de historias por hoy' }, { status: 429 })
    }

    let body: { image?: unknown; filename?: unknown; caption?: unknown; overlays?: unknown; listing_id?: unknown; business_id?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const image = typeof body.image === 'string' ? body.image : ''
    const match = image.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/)
    if (!match) {
      return NextResponse.json({ error: 'Se requiere una imagen (JPEG, PNG o WebP)' }, { status: 400 })
    }
    const bytes = Buffer.from(match[2], 'base64')
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'La imagen es demasiado grande' }, { status: 400 })
    }

    const listingId = typeof body.listing_id === 'string' && body.listing_id ? body.listing_id : null
    const businessId = typeof body.business_id === 'string' && body.business_id ? body.business_id : null

    const caption = typeof body.caption === 'string' ? body.caption.trim() : ''
    if (caption.length > STORY_CAPTION_MAX) {
      return NextResponse.json({ error: 'El texto es demasiado largo (máximo 140 caracteres)' }, { status: 400 })
    }

    const validated = validateOverlays(body.overlays)
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }
    const overlays = validated.overlays

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }

    // Optional links must point at real rows — an invented id fails here.
    if (listingId) {
      const { data } = await admin.from('listings').select('id').eq('id', listingId).eq('status', 'active').maybeSingle()
      if (!data) return NextResponse.json({ error: 'Anuncio no encontrado' }, { status: 400 })
    }
    if (businessId) {
      const { data } = await admin.from('businesses').select('id').eq('id', businessId).maybeSingle()
      if (!data) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 400 })
    }

    const filename = typeof body.filename === 'string' ? body.filename.replace(/[^a-zA-Z0-9._-]/g, '') : ''
    const ext = match[1] === 'png' ? 'png' : match[1] === 'webp' ? 'webp' : 'jpg'
    const contentType = `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}`
    const path = `stories/${user.id}/${Date.now()}-${filename || 'historia'}.${ext}`
    const { error: uploadError } = await admin.storage.from('listing-images').upload(path, bytes, { contentType })
    if (uploadError) {
      return NextResponse.json({ error: `No se pudo subir la imagen: ${uploadError.message}` }, { status: 500 })
    }
    const { data: { publicUrl } } = admin.storage.from('listing-images').getPublicUrl(path)

    const { data: story, error: insertError } = await admin.from('stories').insert({
      author_id: user.id,
      image_url: publicUrl,
      caption: caption || null,
      overlays: overlays.length > 0 ? overlays : null,
      listing_id: listingId,
      business_id: businessId,
    }).select('id, expires_at').single()
    if (insertError || !story) {
      if (isMissingSchema(insertError)) {
        return NextResponse.json({ error: 'Las historias aún no están activadas (falta aplicar la migración 040)' }, { status: 503 })
      }
      return NextResponse.json({ error: 'No se pudo publicar la historia' }, { status: 500 })
    }
    return NextResponse.json({ id: story.id, image_url: publicUrl, expires_at: story.expires_at }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
