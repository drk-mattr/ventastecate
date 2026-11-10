import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import {
  BORDER_PHOTO_BUCKET,
  borderPhotoPath,
  borderPhotoPathFromPublicUrl,
  parseBorderPhotoDataUrl,
  type ParsedBorderPhoto,
} from '@/lib/border/photo'

const reportSchema = z.object({
  // Only the three lanes that exist at Tecate — there is NO
  // SENTRI / Ready Lane here, so they are never offered.
  lane: z.enum(['auto', 'peatonal', 'comercial']),
  // CBP measures into the US only; 'sur' waits exist only as
  // community reports, and are always labeled that way.
  direction: z.enum(['norte', 'sur']).default('norte'),
  wait_minutes: z.number().int().min(0).max(360),
  // en_fila = minutes waited so far (a lower bound);
  // ya_cruce = total minutes (the real wait).
  status: z.enum(['en_fila', 'ya_cruce']),
  note: z.string().max(280).optional(),
  // Dynamics (migration 052): optional one-tap picks. Closed
  // sets — never free text, never parsed from the note. A tail
  // on any lane but auto, or on a ya_cruce report, is stored
  // and simply never aggregated or displayed as a tail.
  pace: z.enum(['rapida', 'normal', 'lenta']).optional(),
  tail_marker: z.enum(['garita', 'glorieta', 'cetis', 'panteon', 'el_alto']).optional(),
  photo_url: z.string().url().optional(),
  // Feed (migration 051): an optional photo as a data URL
  // (`data:image/...;base64,...`, already compressed client-side
  // to <= 5 MB). The route sniffs the signature, uploads to the
  // public listing-images bucket and stores the public URL.
  // A data URL is ~1.37x the binary size; 10M chars caps the
  // payload, the byte check after decode is authoritative.
  image: z.string().max(10_000_000).optional(),
})

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

// Upload one photo for a post. Returns the public URL, or null
// when the upload fails — a photo failure must never eat a
// wait-time report: the report still posts, without a photo.
async function uploadBorderPhoto(
  admin: AdminClient,
  userId: string,
  reportId: string,
  parsed: Extract<ParsedBorderPhoto, { ok: true }>,
): Promise<string | null> {
  const path = borderPhotoPath(userId, reportId, parsed.ext)
  const { error } = await admin.storage
    .from(BORDER_PHOTO_BUCKET)
    .upload(path, parsed.bytes, { contentType: parsed.contentType, upsert: true })
  if (error) {
    console.error('border photo upload error:', error.message)
    return null
  }
  const {
    data: { publicUrl },
  } = admin.storage.from(BORDER_PHOTO_BUCKET).getPublicUrl(path)
  return publicUrl
}

// Remove a previous photo object when a replace lands at a
// different path (or at no path). Best-effort: a failed cleanup
// never blocks the report.
async function removeOldPhoto(admin: AdminClient, oldPath: string | null, newPath: string | null) {
  if (!oldPath || oldPath === newPath) return
  const { error } = await admin.storage.from(BORDER_PHOTO_BUCKET).remove([oldPath])
  if (error) console.error('border photo cleanup error:', error.message)
}

// POST /api/border/report — a signed-in user reports the line.
// Body: { lane, direction?, wait_minutes, status, note?, pace?, tail_marker?, photo_url?, image? }
// One report per user per lane+direction per 15 minutes (DB count):
// a second report inside the window REPLACES the first (people
// update as the line moves) instead of stacking. The estimate
// itself filters outliers and denied reports at read time
// (lib/border/estimate.ts) — this route stores everything.
// A replace refreshes the whole post, photo included: a new
// photo overwrites the old object at the same path (upsert), a
// replace with no photo clears it.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Inicia sesión para reportar la fila' },
        { status: 401 },
      )
    }

    const limit = rateLimit(`border-report:${user.id}`, 10, 15 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Espera un momento antes de reportar de nuevo' },
        { status: 429 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const parsed = reportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const { lane, direction, wait_minutes, status, note, pace, tail_marker, photo_url, image } = parsed.data

    let parsedImage: Extract<ParsedBorderPhoto, { ok: true }> | null = null
    if (image !== undefined) {
      const photo = parseBorderPhotoDataUrl(image)
      if (!photo.ok) {
        return NextResponse.json({ error: photo.error }, { status: 400 })
      }
      parsedImage = photo
    }

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }

    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: existing, error: existingError } = await admin
      .from('border_line_reports')
      .select('id, photo_url')
      .eq('user_id', user.id)
      .eq('lane', lane)
      .eq('direction', direction)
      .gte('created_at', fifteenMinAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existingError) {
      if (isMissingSchema(existingError)) {
        return NextResponse.json(
          { error: 'La garita aún no está activada (falta aplicar la migración 049)' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: 'No se pudo guardar el reporte' }, { status: 500 })
    }

    if (existing) {
      // Replace: refresh the numbers and the timestamp, and drop
      // the old confirm/deny votes — they verified the previous
      // reading, not this one.
      const oldPath = borderPhotoPathFromPublicUrl(existing.photo_url ?? null)
      let newPhotoUrl: string | null = null
      if (parsedImage) {
        newPhotoUrl = await uploadBorderPhoto(admin, user.id, existing.id, parsedImage)
      } else if (photo_url) {
        newPhotoUrl = photo_url
      }
      const { error: voteError } = await admin
        .from('border_line_votes')
        .delete()
        .eq('report_id', existing.id)
      if (voteError) {
        return NextResponse.json({ error: 'No se pudo guardar el reporte' }, { status: 500 })
      }
      const { error: updateError } = await admin
        .from('border_line_reports')
        .update({
          wait_minutes,
          status,
          note: note?.trim() || null,
          // A replace refreshes the dynamics too: a replace
          // with no pace clears the old pace, like the note
          // and the photo.
          pace: pace ?? null,
          tail_marker: tail_marker ?? null,
          photo_url: newPhotoUrl,
          created_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
      if (updateError) {
        return NextResponse.json({ error: 'No se pudo guardar el reporte' }, { status: 500 })
      }
      await removeOldPhoto(
        admin,
        oldPath,
        borderPhotoPathFromPublicUrl(newPhotoUrl),
      )
      return NextResponse.json(
        { id: existing.id, replaced: true, photoUploaded: newPhotoUrl !== null },
        { status: 200 },
      )
    }

    const { data: report, error: insertError } = await admin
      .from('border_line_reports')
      .insert({
        user_id: user.id,
        lane,
        direction,
        wait_minutes,
        status,
        note: note?.trim() || null,
        pace: pace ?? null,
        tail_marker: tail_marker ?? null,
        photo_url: photo_url || null,
      })
      .select('id')
      .single()
    if (insertError || !report) {
      if (isMissingSchema(insertError)) {
        return NextResponse.json(
          { error: 'La garita aún no está activada (falta aplicar la migración 049)' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: 'No se pudo guardar el reporte' }, { status: 500 })
    }
    let photoUploaded = false
    if (parsedImage) {
      const publicUrl = await uploadBorderPhoto(admin, user.id, report.id, parsedImage)
      if (publicUrl) {
        const { error: photoError } = await admin
          .from('border_line_reports')
          .update({ photo_url: publicUrl })
          .eq('id', report.id)
        photoUploaded = !photoError
      }
    }
    return NextResponse.json({ id: report.id, photoUploaded }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
