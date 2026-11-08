'use client'

// Business-page "Actividad" feed (/businesses/[id]).
//
// ONE chronological feed merging the two things that already happen
// around a business — item comments and ratings — newest first, each
// entry visibly typed. No business-level comment box (see the 2026-11-07
// activity analysis): commenting happens on the item, rating happens
// via Opinar; this page collects both.
//
// Entry types:
//   - Item comment: avatar, name, "comentó sobre <item>" -> /items/[id],
//     text, time, report + delete-own (the existing item-comment flows).
//   - Rating with text: the same comment card with its stars attached.
//     The text IS the review body — it appears once, not twice.
//   - Rating without text: a compact one-liner ("dejó 5 estrellas").
// Mentions are NOT feed entries (they render in the grid above);
// follows/likes/new offerings are NOT entries (counts already show).
// Ratings stay display-only; no score is computed from the feed.

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/ui/user-avatar'
import type { BusinessReview, ItemComment } from '@/lib/types/database'
import { ReviewStars } from '@/components/businesses/review-stars'
import { ReviewForm } from '@/components/businesses/review-form'
import { Flag } from 'lucide-react'

export type ActivityItemComment = ItemComment & {
  itemName: string
}

const REVIEW_REPORT_REASONS = [
  { value: 'business_review_spam', label: 'Spam' },
  { value: 'business_review_offensive', label: 'Contenido ofensivo' },
  { value: 'business_review_prohibited', label: 'Contenido prohibido' },
  { value: 'business_review_other', label: 'Otro motivo' },
] as const

const COMMENT_REPORT_REASONS = [
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

type FeedEntry =
  | { kind: 'comment'; createdAt: string; comment: ActivityItemComment }
  | { kind: 'review'; createdAt: string; review: BusinessReview }

export function BusinessActivityFeed({
  businessId,
  initialReviews,
  initialComments,
  currentUserId,
  isOwner,
  hasOfferings,
  firstItemId,
}: {
  businessId: string
  initialReviews: BusinessReview[]
  initialComments: ActivityItemComment[]
  currentUserId?: string | null
  isOwner: boolean
  hasOfferings: boolean
  firstItemId?: string | null
}) {
  const [reviews, setReviews] = useState<BusinessReview[]>(initialReviews)
  const [comments, setComments] = useState<ActivityItemComment[]>(initialComments)
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)
  const [reportedReviewIds, setReportedReviewIds] = useState<Set<string>>(new Set())
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null)
  const [reportedCommentIds, setReportedCommentIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const myReview = currentUserId
    ? reviews.find((r) => r.user_id === currentUserId)
    : undefined

  const reviewCount = reviews.length
  const reviewAverage =
    reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0

  const entries: FeedEntry[] = [
    ...comments.map((comment) => ({
      kind: 'comment' as const,
      createdAt: comment.created_at,
      comment,
    })),
    ...reviews.map((review) => ({
      kind: 'review' as const,
      createdAt: review.created_at,
      review,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handleReviewReport = async (reviewId: string, reason: string) => {
    const res = await fetch(`/api/businesses/${businessId}/reviews/${reviewId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      setReportedReviewIds((prev) => new Set(prev).add(reviewId))
      setReportingReviewId(null)
    }
  }

  const handleCommentDelete = async (commentId: string) => {
    const { error: delError } = await supabase
      .from('item_comments')
      .delete()
      .eq('id', commentId)
    if (!delError) {
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    }
  }

  const handleCommentReport = async (commentId: string, itemId: string, reason: string) => {
    const res = await fetch(`/api/items/${itemId}/comments/${commentId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      setReportedCommentIds((prev) => new Set(prev).add(commentId))
      setReportingCommentId(null)
    }
  }

  // Report affordance, shared by both entry types: opens a review in
  // /admin/reports; it never hides the entry. Same shape as the old
  // Opiniones list and the item comment section.
  const renderReport = (
    entryId: string,
    isOwn: boolean,
    reportingId: string | null,
    reportedIds: Set<string>,
    reasons: readonly { value: string; label: string }[],
    onReport: (reason: string) => void,
    onPick: (id: string) => void,
    onCancel: () => void,
  ) => {
    if (!currentUserId || isOwn) return null
    return (
      <div className="mt-1">
        {reportedIds.has(entryId) ? (
          <span className="text-[11px] text-gray-400">Reporte enviado, gracias.</span>
        ) : reportingId === entryId ? (
          <span className="flex flex-wrap items-center gap-1.5">
            {reasons.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => onReport(r.value)}
                className="text-[11px] border border-gray-200 rounded-full px-2 py-0.5 text-gray-600 hover:bg-gray-50"
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onCancel}
              className="text-[11px] text-gray-400 hover:text-gray-600"
            >
              Cancelar
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onPick(entryId)}
            className="text-[11px] text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
          >
            <Flag className="h-3 w-3" /> Reportar
          </button>
        )}
      </div>
    )
  }

  const renderProfileName = (profile: BusinessReview['profile'] | ItemComment['profile']) =>
    profile ? (
      <Link
        href={`/users/${profile.username}`}
        className="text-xs font-semibold hover:underline"
      >
        {profile.display_name}
      </Link>
    ) : (
      <span className="text-xs font-semibold text-gray-400">Usuario</span>
    )

  return (
    <section id="actividad" className="mt-8 pt-8 border-t">
      <h2 className="text-base font-semibold mb-1">Actividad</h2>
      {/* Aggregate stays on top: the summary; the feed is the detail. */}
      {reviewCount > 0 ? (
        <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <ReviewStars value={reviewAverage} />
          <span>
            {reviewAverage.toFixed(1)} · {reviewCount} {reviewCount === 1 ? 'opinión' : 'opiniones'}
          </span>
        </p>
      ) : (
        <p className="text-sm text-gray-400 mb-6">Aún no hay opiniones.</p>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 mb-6">
          Aún no hay actividad aquí. Sé el primero en opinar
          {hasOfferings && firstItemId ? (
            <>
              {' '}o <Link href={`/items/${firstItemId}`} className="underline hover:text-gray-700">comenta sobre un producto</Link>
            </>
          ) : (
            '.'
          )}
        </p>
      ) : (
        <div className="space-y-4 mb-6">
          {entries.map((entry) => {
            if (entry.kind === 'comment') {
              const comment = entry.comment
              return (
                <div key={`comment-${comment.id}`} className="flex gap-3">
                  <UserAvatar
                    src={comment.profile?.avatar_url}
                    name={comment.profile?.display_name || '?'}
                    size="md"
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      {renderProfileName(comment.profile)}
                      <span className="text-xs text-gray-500">
                        comentó sobre{' '}
                        <Link href={`/items/${comment.item_id}`} className="font-semibold text-gray-900 hover:underline">
                          {comment.itemName || 'este producto'}
                        </Link>
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                      {currentUserId && currentUserId === comment.author_id && (
                        <button
                          onClick={() => handleCommentDelete(comment.id)}
                          className="text-[11px] text-red-400 hover:text-red-600 ml-auto"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
                      {comment.body}
                    </p>
                    {renderReport(
                      comment.id,
                      currentUserId === comment.author_id,
                      reportingCommentId,
                      reportedCommentIds,
                      COMMENT_REPORT_REASONS,
                      (reason) => handleCommentReport(comment.id, comment.item_id, reason),
                      setReportingCommentId,
                      () => setReportingCommentId(null),
                    )}
                  </div>
                </div>
              )
            }

            const review = entry.review
            const isOwnReview = currentUserId === review.user_id
            // Rating without text: a compact one-liner, not a big
            // empty card.
            if (!review.body) {
              return (
                <div key={`review-${review.id}`} className="flex gap-3 items-center">
                  <UserAvatar
                    src={review.profile?.avatar_url}
                    name={review.profile?.display_name || '?'}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 flex items-baseline gap-1.5 flex-wrap">
                      {renderProfileName(review.profile)}
                      <span>
                        dejó {review.rating} {review.rating === 1 ? 'estrella' : 'estrellas'}
                      </span>
                      <ReviewStars value={review.rating} className="h-3 w-3" />
                      <span className="text-[11px] text-gray-400">
                        {formatTimeAgo(review.created_at)}
                      </span>
                      {isOwnReview && (
                        <span className="text-[11px] text-gray-400">Tu opinión</span>
                      )}
                    </p>
                    {renderReport(
                      review.id,
                      isOwnReview,
                      reportingReviewId,
                      reportedReviewIds,
                      REVIEW_REPORT_REASONS,
                      (reason) => handleReviewReport(review.id, reason),
                      setReportingReviewId,
                      () => setReportingReviewId(null),
                    )}
                  </div>
                </div>
              )
            }

            // Rating with text: the same comment card with its stars
            // attached. The text IS the review body — it appears once,
            // not twice.
            return (
              <div key={`review-${review.id}`} className="flex gap-3">
                <UserAvatar
                  src={review.profile?.avatar_url}
                  name={review.profile?.display_name || '?'}
                  size="md"
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {renderProfileName(review.profile)}
                    <ReviewStars value={review.rating} className="h-3 w-3" />
                    <span className="text-[11px] text-gray-400">
                      {formatTimeAgo(review.created_at)}
                    </span>
                    {isOwnReview && (
                      <span className="text-[11px] text-gray-400">Tu opinión</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
                    {review.body}
                  </p>
                  {renderReport(
                    review.id,
                    isOwnReview,
                    reportingReviewId,
                    reportedReviewIds,
                    REVIEW_REPORT_REASONS,
                    (reason) => handleReviewReport(review.id, reason),
                    setReportingReviewId,
                    () => setReportingReviewId(null),
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review form — signed-in only, never the claimed owner.
          The form itself lives in review-form.tsx, shared with the
          review pop-up; a save here updates this feed's entries. */}
      {currentUserId && !isOwner && (
        <ReviewForm
          businessId={businessId}
          myReview={myReview}
          onSaved={(savedReview) => {
            setReviews((prev) => {
              const others = prev.filter((r) => r.user_id !== savedReview.user_id)
              return [savedReview, ...others]
            })
          }}
        />
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
