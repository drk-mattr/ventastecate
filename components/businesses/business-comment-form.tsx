'use client'

// Business-page comment composer: a plain textarea, no stars.
// Stars live only behind Opinar. The owner CAN comment — answering
// a general question is the point of a business-level thread.
// Posting goes through POST /api/businesses/[id]/comments
// (rate-limited, plain-Spanish errors); the feed prepends the
// saved comment on success.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import type { BusinessComment } from '@/lib/types/database'

export function BusinessCommentForm({
  businessId,
  onSaved,
}: {
  businessId: string
  onSaved: (comment: BusinessComment) => void
}) {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    if (content.length > 1000) {
      setError('El comentario no puede superar 1000 caracteres')
      return
    }
    setError('')

    startTransition(async () => {
      const res = await fetch(`/api/businesses/${businessId}/comments`, {
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
        onSaved(data.comment as BusinessComment)
        setContent('')
      }
    })
  }

  return (
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
  )
}
