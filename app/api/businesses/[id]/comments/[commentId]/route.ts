// DELETE /api/businesses/[id]/comments/[commentId]
//
// Delete your own business comment. The author check runs here
// (a stranger's id answers 404, same as not found — it does not
// leak authorship), and the RLS owner-delete policy is the second
// gate. The report route lives under [commentId]/report.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function isMissingSchema(error: { code?: string } | null): boolean {
  if (!error) return false
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204'
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const { id: businessId, commentId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Inicia sesión para eliminar' }, { status: 401 })
    }

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })

    const { data: comment, error: commentError } = await admin
      .from('business_comments')
      .select('id, business_id, author_id')
      .eq('id', commentId)
      .single()
    if (commentError || !comment || comment.business_id !== businessId) {
      if (isMissingSchema(commentError)) {
        return NextResponse.json(
          { error: 'Los comentarios aún no están activados (falta aplicar la migración 053)' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 })
    }
    if (comment.author_id !== user.id) {
      return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 })
    }

    const { error: deleteError } = await admin
      .from('business_comments')
      .delete()
      .eq('id', commentId)
    if (deleteError) {
      console.error('business comment delete error:', deleteError.message)
      return NextResponse.json({ error: 'No se pudo eliminar el comentario' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
