'use client'

// Items engine — per-item comments on the item view (/items/[id]).
//
// A comment is a short public note on ONE offering. It feeds no
// score (§7.2 — there is no recommendation_score until item_feedback
// data exists). Posting goes through POST /api/items/[id]/comments
// (rate-limited, plain-Spanish errors); deleting your own comment
// goes straight to Supabase under the owner-delete RLS policy —
// same shape as the listing CommentSection. Reporting a comment
// opens a review in /admin/reports; it never hides the comment.

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Textarea } from '@/components/ui/textarea'
import type { ItemComment } from '@/lib/types/database'
import { MessageCircle, Send, Flag } from 'lucide-react'

const REPORT_REASONS = [
  { value: 'item_comment_spam', label: 'Spam' },
  { value: 'item_comment_offensive', label: 'Contenido ofensivo' },
  { value: 'item_comment_prohibited', label: 'Contenido prohibido' },
  { value: 'item_comment_other', label: 'Otro motivo' },
] as const

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`
  if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`
  if (mins > 0) return `hace ${mins} min`
  return 'ahora mismo'
}

export function ItemCommentSection({
  itemId,
  initialComments,
  commentsAvailable,
  currentUserId,
}: {
  itemId: string
  initialComments: ItemComment[]
  commentsAvailable: boolean
  currentUserId?: string | null
}) {
  const [comments, setComments] = useState<ItemComment[]>(initialComments)
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    if (content.length > 1000) {
      setError('El comentario no puede superar 1000 caracteres')
      return
    }
    setError('')

    startTransition(async () => {
      const res = await fetch(`/api/items/${itemId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: content.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          typeof data?.error === 'string' && data.error
            ? data.error
            : 'No se pudo publicar el comentario. Intenta de nuevo.',
        )
        return
      }
      if (data?.comment) {
        setComments((prev) => [...prev, data.comment as ItemComment])
        setContent('')
      }
    })
  }

  const handleDelete = async (commentId: string) => {
    const { error: delError } = await supabase
      .from('item_comments')
      .delete()
      .eq('id', commentId)
    if (!delError) {
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    }
  }

  const handleReport = async (commentId: string, reason: string) => {
    const res = await fetch(`/api/items/${itemId}/comments/${commentId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      setReportedIds((prev) => new Set(prev).add(commentId))
      setReportingId(null)
    }
  }

  return (
    <section className="mt-8 pt-8 border-t">
      <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        Comentarios
        {comments.length > 0 && (
          <span className="text-sm font-normal text-gray-400">({comments.length})</span>
        )}
      </h2>

      {!commentsAvailable ? (
        <p className="text-sm text-gray-400 mb-6">
          Los comentarios aún no están activados — falta aplicar la migración 041.
        </p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 mb-6">Sé el primero en comentar.</p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <UserAvatar
                src={comment.profile?.avatar_url}
                name={comment.profile?.display_name || '?'}
                size="md"
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  {comment.profile ? (
                    <Link
                      href={`/users/${comment.profile.username}`}
                      className="text-xs font-semibold hover:underline"
                    >
                      {comment.profile.display_name}
                    </Link>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400">Usuario</span>
                  )}
                  <span className="text-[11px] text-gray-400">{formatTimeAgo(comment.created_at)}</span>
                  {currentUserId && currentUserId === comment.author_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-[11px] text-red-400 hover:text-red-600 ml-auto"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
                  {comment.body}
                </p>
                {/* Report: opens a review, never hides the comment. */}
                {currentUserId && currentUserId !== comment.author_id && (
                  <div className="mt-1">
                    {reportedIds.has(comment.id) ? (
                      <span className="text-[11px] text-gray-400">Reporte enviado, gracias.</span>
                    ) : reportingId === comment.id ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {REPORT_REASONS.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => handleReport(comment.id, r.value)}
                            className="text-[11px] border border-gray-200 rounded-full px-2 py-0.5 text-gray-600 hover:bg-gray-50"
                          >
                            {r.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setReportingId(null)}
                          className="text-[11px] text-gray-400 hover:text-gray-600"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setReportingId(comment.id)}
                        className="text-[11px] text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                      >
                        <Flag className="h-3 w-3" /> Reportar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment form — only when comments are live and the user is signed in. */}
      {commentsAvailable && currentUserId && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe un comentario..."
            rows={3}
            maxLength={1000}
            disabled={isPending}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{content.length}/1000</span>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !content.trim()}
              className="flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {isPending ? 'Publicando...' : 'Comentar'}
            </Button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      )}
    </section>
  )
}
