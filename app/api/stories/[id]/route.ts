import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

// DELETE /api/stories/[id] — the owner deletes their own story.
// RLS already allows owner delete (migration 040); the route enforces
// the same ownership check so a signed-in user can only delete their
// own. The storage object is removed best-effort — a missing file
// must not fail the delete. This is what makes test stories safe to
// post: anything posted by mistake can be removed right away.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: storyId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Inicia sesión para eliminar la historia' }, { status: 401 })
    }

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

    const { data: story, error: storyError } = await admin
      .from('stories')
      .select('id, author_id, image_url')
      .eq('id', storyId)
      .single()
    if (storyError || !story) {
      if (isMissingSchema(storyError)) {
        return NextResponse.json({ error: 'Las historias aún no están activadas (falta aplicar la migración 040)' }, { status: 503 })
      }
      return NextResponse.json({ error: 'Historia no encontrada' }, { status: 404 })
    }
    if (story.author_id !== user.id) {
      return NextResponse.json({ error: 'No puedes eliminar esta historia' }, { status: 403 })
    }

    const { error: deleteError } = await admin.from('stories').delete().eq('id', storyId)
    if (deleteError) {
      return NextResponse.json({ error: 'No se pudo eliminar la historia' }, { status: 500 })
    }

    // Best-effort storage cleanup: the public URL carries the path
    // inside the listing-images bucket after '/listing-images/'.
    const marker = '/listing-images/'
    const at = story.image_url.indexOf(marker)
    if (at >= 0) {
      const path = story.image_url.slice(at + marker.length)
      if (path) {
        await admin.storage.from('listing-images').remove([path])
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
