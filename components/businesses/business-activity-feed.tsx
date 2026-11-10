'use client'

// Business-page "Comentarios" feed (/businesses/[id]).
//
// ONE chronological feed merging the three things that happen around
// a business — business comments, item comments, and ratings —
// newest first, each entry visibly typed. This reverses the PR #127
// rule ("commenting happens on the item, no business-level comment
// box"): business comments exist for general questions and notes
// about the business ("¿abren los domingos?"); item comments stay
// for talk about one specific offering. Ratings arrive ONLY via
// Opinar (the dialog in the identity block) — there is no star
// function in this section.
//
// Entry types:
//   - Business comment: avatar, name, "Comentó" (+ "Dueño" when the
//     author is the claimed owner), text, time, report + delete-own.
//     The owner CAN comment — answering a general question is the
//     point of a business-level thread.
//   - Item comment: avatar, name, "comentó sobre <item>" ->
//     /items/[id], text, time, report + delete-own (the existing
//     item-comment flows).
//   - Rating with text: the same comment card with its stars attached.
//     The text IS the review body — it appears once, not twice.
//   - Rating without text: a compact one-liner ("dejó 5 estrellas").
// Mentions are NOT feed entries (they render in the grid above);
// follows are NOT entries (the count already shows).
// Ratings stay display-only; no score is computed from the feed.

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/ui/user-avatar'
import type { BusinessComment, BusinessReview, ItemComment } from '@/lib/types/database'
import { ReviewStars } from '@/components/businesses/review-stars'
import { BusinessCommentForm } from '@/components/businesses/business-comment-form'
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

const BUSINESS_COMMENT_REPORT_REASONS = [
  { value: 'business_comment_spam', label: 'Spam' },
  { value: 'business_comment_offensive', label: 'Contenido ofensivo' },
  { value: 'business_comment_prohibited', label: 'Contenido prohibido' },
  { value: 'business_comment_other', label: 'Otro motivo' },
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
  | { kind: 'businessComment'; createdAt: string; comment: BusinessComment }
  | { kind: 'comment'; createdAt: string; comment: ActivityItemComment }
  | { kind: 'review'; createdAt: string; review: BusinessReview }

export function BusinessActivityFeed({
  businessId,
  initialReviews,
  initialComments,
  initialBusinessComments,
  currentUserId,
  claimedBy,
}: {
  businessId: string
  initialReviews: BusinessReview[]
  initialComments: ActivityItemComment[]
  initialBusinessComments: BusinessComment[]
  currentUserId?: string | null
  claimedBy?: string | null
}) {
  const [comments, setComments] = useState<ActivityItemComment[]>(initialComments)
  const [businessComments, setBusinessComments] = useState<BusinessComment[]>(initialBusinessComments)
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)
  const [reportedReviewIds, setReportedReviewIds] = useState<Set<string>>(new Set())
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null)
  const [reportedCommentIds, setReportedCommentIds] = useState<Set<string>>(new Set())
  const [reportingBusinessCommentId, setReportingBusinessCommentId] = useState<string | null>(null)
  const [reportedBusinessCommentIds, setReportedBusinessCommentIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const entries: FeedEntry[] = [
    ...businessComments.map((comment) => ({
      kind: 'businessComment' as const,
      createdAt: comment.created_at,
      comment,
    })),
    ...comments.map((comment) => ({
      kind: 'comment' as const,
      createdAt: comment.created_at,
      comment,
    })),
    ...initialReviews.map((review) => ({
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

  const handleBusinessCommentDelete = async (commentId: string) => {
    const res = await fetch(`/api/businesses/${businessId}/comments/${commentId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setBusinessComments((prev) => prev.filter((c) => c.id !== commentId))
    }
  }

  const handleBusinessCommentReport = async (commentId: string, reason: string) => {
    const res = await fetch(`/api/businesses/${businessId}/comments/${commentId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      setReportedBusinessCommentIds((prev) => new Set(prev).add(commentId))
      setReportingBusinessCommentId(null)
    }
  }

  // Report affordance, shared by all three entry types: opens a review
  // in /admin/reports; it never hides the entry. Same shape as the old
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

  const renderProfileName = (profile: BusinessReview['profile'] | ItemComment['profile'] | BusinessComment['profile']) =>
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
    <section id="comentarios" className="mt-8 pt-8 border-t">
      <h2 className="text-base font-semibold mb-4">Comentarios</h2>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 mb-6">
          Aún no hay comentarios. Sé el primero en comentar.
        </p>
      ) : (
        <div className="space-y-4 mb-6">
          {entries.map((entry) => {
            if (entry.kind === 'businessComment') {
              const comment = entry.comment
              const isOwnerComment = claimedBy !== null && comment.author_id === claimedBy
              return (
                <div key={`business-comment-${comment.id}`} className="flex gap-3">
                  <UserAvatar
                    src={comment.profile?.avatar_url}
                    name={comment.profile?.display_name || '?'}
                    size="md"
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      {renderProfileName(comment.profile)}
                      <span className="text-xs text-gray-500">Comentó</span>
                      {isOwnerComment && (
                        <span className="text-[11px] font-medium text-gray-500 border border-gray-200 rounded-full px-1.5 py-px">
                          Dueño
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                      {currentUserId && currentUserId === comment.author_id && (
                        <button
                          onClick={() => handleBusinessCommentDelete(comment.id)}
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
                      reportingBusinessCommentId,
                      reportedBusinessCommentIds,
                      BUSINESS_COMMENT_REPORT_REASONS,
                      (reason) => handleBusinessCommentReport(comment.id, reason),
                      setReportingBusinessCommentId,
                      () => setReportingBusinessCommentId(null),
                    )}
                  </div>
                </div>
              )
            }

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

      {/* Comment form — signed-in only. The owner CAN comment:
          answering a general question is the point of a
          business-level thread. Stars live only behind Opinar. */}
      {currentUserId ? (
        <BusinessCommentForm
          businessId={businessId}
          onSaved={(savedComment) => {
            setBusinessComments((prev) => [savedComment, ...prev])
          }}
        />
      ) : (
        <Link
          href={`/login?redirect=/businesses/${businessId}`}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Inicia sesión para comentar
        </Link>
      )}
    </section>
  )
}
