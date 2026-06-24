'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Textarea } from '@/components/ui/textarea'
import { ListingComment } from '@/lib/types/database'
import { MessageCircle, Send } from 'lucide-react'

interface CommentSectionProps {
  listingId: string
  initialComments: ListingComment[]
  currentUserId?: string | null
}

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

export function CommentSection({ listingId, initialComments, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<ListingComment[]>(initialComments)
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
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
      const { data, error: insertError } = await supabase
        .from('listing_comments')
        .insert({ listing_id: listingId, user_id: currentUserId, content: content.trim() })
        .select('*, profile:profiles(username, display_name, avatar_url)')
        .single()

      if (insertError) {
        setError('No se pudo publicar el comentario. Intenta de nuevo.')
        return
      }

      if (data) {
        setComments((prev) => [...prev, data as ListingComment])
        setContent('')
      }
    })
  }

  const handleDelete = async (commentId: string) => {
    const { error: delError } = await supabase
      .from('listing_comments')
      .delete()
      .eq('id', commentId)

    if (!delError) {
      setComments((prev) => prev.filter((c) => c.id !== commentId))
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

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-400 mb-6">Sé el primero en comentar.</p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              {/* Avatar */}
              <UserAvatar
                src={comment.profile?.avatar_url}
                name={comment.profile?.display_name || '?'}
                size="md"
                className="mt-0.5"
              />

              {/* Content */}
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
                  {/* Delete button for own comments */}
                  {currentUserId && currentUserId === comment.user_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-[11px] text-red-400 hover:text-red-600 ml-auto"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment form — only shown to signed-in users */}
      {currentUserId && (
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
