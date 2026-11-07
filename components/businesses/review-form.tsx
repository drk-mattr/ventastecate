'use client'

// The review form: 1–5 black stars plus an optional short note.
// Shared by the inline Opiniones section and the review pop-up, so
// both write through the same POST /api/businesses/[id]/reviews.
// One review per user per business; a repeat call updates it.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { BusinessReview } from '@/lib/types/database'
import { Star } from 'lucide-react'

export function ReviewForm({
  businessId,
  myReview,
  onSaved,
}: {
  businessId: string
  myReview?: BusinessReview | null
  onSaved?: (review: BusinessReview) => void
}) {
  const [rating, setRating] = useState(myReview?.rating ?? 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [body, setBody] = useState(myReview?.body ?? '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating < 1 || rating > 5) {
      setError('Elige una calificación de 1 a 5 estrellas')
      return
    }
    if (body.length > 1000) {
      setError('La opinión no puede superar 1000 caracteres')
      return
    }
    setError('')

    startTransition(async () => {
      const res = await fetch(`/api/businesses/${businessId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, body: body.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          typeof data?.error === 'string' && data.error
            ? data.error
            : 'No se pudo guardar tu opinión. Intenta de nuevo.',
        )
        return
      }
      if (data?.review) {
        const savedReview = data.review as BusinessReview
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        onSaved?.(savedReview)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-sm font-medium">
        {myReview ? 'Tu opinión' : 'Escribe tu opinión'}
      </p>
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHoverRating(0)}
        role="radiogroup"
        aria-label="Calificación de 1 a 5 estrellas"
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= (hoverRating || rating)
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
              onMouseEnter={() => setHoverRating(n)}
              onClick={() => setRating(n)}
              className="p-0.5"
            >
              <Star
                className={`h-6 w-6 ${active ? 'text-gray-900' : 'text-gray-300'}`}
                fill={active ? 'currentColor' : 'none'}
              />
            </button>
          )
        })}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Cuéntales a otros cómo te fue (opcional)..."
        rows={3}
        maxLength={1000}
        disabled={isPending}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{body.length}/1000</span>
        <Button type="submit" size="sm" disabled={isPending || rating < 1}>
          {isPending ? 'Guardando...' : saved ? 'Guardada' : myReview ? 'Actualizar opinión' : 'Publicar opinión'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  )
}
