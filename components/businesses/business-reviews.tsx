'use client'

// Business ratings + reviews on the business page (/businesses/[id]).
//
// A review is 1–5 stars plus an optional short note, one per user
// per business. It is display-only: it feeds no score and no ranking.
// Posting goes through POST /api/businesses/[id]/reviews (a repeat
// call updates the caller's own review); the claimed owner is blocked
// server-side (403). Reporting a review opens a review in
// /admin/reports; it never hides the review.

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Textarea } from '@/components/ui/textarea'
import type { BusinessReview } from '@/lib/types/database'
import { ReviewStars } from '@/components/businesses/review-stars'
import { Flag, Star } from 'lucide-react'

const REPORT_REASONS = [
  { value: 'business_review_spam', label: 'Spam' },
  { value: 'business_review_offensive', label: 'Contenido ofensivo' },
  { value: 'business_review_prohibited', label: 'Contenido prohibido' },
  { value: 'business_review_other', label: 'Otro motivo' },
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

export function BusinessReviews({
  businessId,
  initialReviews,
  currentUserId,
  isOwner,
}: {
  businessId: string
  initialReviews: BusinessReview[]
  currentUserId?: string | null
  isOwner: boolean
}) {
  const [reviews, setReviews] = useState<BusinessReview[]>(initialReviews)
  const myReview = currentUserId
    ? reviews.find((r) => r.user_id === currentUserId)
    : undefined
  const [rating, setRating] = useState(myReview?.rating ?? 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [body, setBody] = useState(myReview?.body ?? '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())

  const count = reviews.length
  const average =
    count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0

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
        setReviews((prev) => {
          const others = prev.filter((r) => r.user_id !== savedReview.user_id)
          return [savedReview, ...others]
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  const handleReport = async (reviewId: string, reason: string) => {
    const res = await fetch(`/api/businesses/${businessId}/reviews/${reviewId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      setReportedIds((prev) => new Set(prev).add(reviewId))
      setReportingId(null)
    }
  }

  return (
    <section id="opiniones" className="mt-8 pt-8 border-t">
      <h2 className="text-base font-semibold mb-1">Opiniones</h2>
      {count > 0 ? (
        <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <ReviewStars value={average} />
          <span>
            {average.toFixed(1)} · {count} {count === 1 ? 'opinión' : 'opiniones'}
          </span>
        </p>
      ) : (
        <p className="text-sm text-gray-400 mb-6">Aún no hay opiniones.</p>
      )}

      {count > 0 && (
        <div className="space-y-4 mb-6">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-3">
              <UserAvatar
                src={review.profile?.avatar_url}
                name={review.profile?.display_name || '?'}
                size="md"
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  {review.profile ? (
                    <Link
                      href={`/users/${review.profile.username}`}
                      className="text-xs font-semibold hover:underline"
                    >
                      {review.profile.display_name}
                    </Link>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400">Usuario</span>
                  )}
                  <ReviewStars value={review.rating} className="h-3 w-3" />
                  <span className="text-[11px] text-gray-400">
                    {formatTimeAgo(review.created_at)}
                  </span>
                  {currentUserId === review.user_id && (
                    <span className="text-[11px] text-gray-400">Tu opinión</span>
                  )}
                </div>
                {review.body && (
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
                    {review.body}
                  </p>
                )}
                {/* Report: opens a review, never hides the review. */}
                {currentUserId && currentUserId !== review.user_id && (
                  <div className="mt-1">
                    {reportedIds.has(review.id) ? (
                      <span className="text-[11px] text-gray-400">Reporte enviado, gracias.</span>
                    ) : reportingId === review.id ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {REPORT_REASONS.map((r) => (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => handleReport(review.id, r.value)}
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
                        onClick={() => setReportingId(review.id)}
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

      {/* Review form — signed-in only, never the claimed owner. */}
      {currentUserId && !isOwner && (
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
      )}

      {currentUserId && isOwner && (
        <p className="text-sm text-gray-400">Este negocio es tuyo — no puedes opinar sobre él.</p>
      )}

      {!currentUserId && (
        <Link
          href={`/login?redirect=/businesses/${businessId}`}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Inicia sesión para opinar
        </Link>
      )}
    </section>
  )
}
