'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Flag, ExternalLink, Trash2 } from 'lucide-react'
import type { StoryWithAuthor } from '@/lib/types/database'
import {
  displayedImageRect,
  isEmojiOnly,
  overlayBaseFontSize,
  overlayStyle,
  type ImageRect,
} from '@/lib/stories/overlay-geometry'

// One author's stories, newest first — the unit the viewer steps through.
export type StoryAuthorGroup = {
  authorId: string
  displayName: string
  username: string
  avatarUrl?: string
  stories: StoryWithAuthor[]
}

const STORY_MS = 5000

const REPORT_REASONS = [
  { id: 'story_spam', label: 'Spam' },
  { id: 'story_offensive', label: 'Contenido ofensivo' },
  { id: 'story_prohibited', label: 'Contenido prohibido' },
  { id: 'story_other', label: 'Otro motivo' },
] as const

function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

interface StoryViewerProps {
  groups: StoryAuthorGroup[]
  startGroup: number
  onClose: () => void
  /** Signed-in user id, so the viewer can offer delete on own stories. */
  currentUserId?: string | null
  /** Called after the user deletes a story (rail closes + refreshes). */
  onStoryDeleted?: () => void
}

export function StoryViewer({ groups, startGroup, onClose, currentUserId, onStoryDeleted }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(startGroup)
  const [index, setIndex] = useState(0)
  const [remaining, setRemaining] = useState<string | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Displayed-photo geometry, for placing overlays inside the
  // letterboxed image (same helper as the composer — see
  // lib/stories/overlay-geometry.ts).
  const imageWrapRef = useRef<HTMLDivElement | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [wrapSize, setWrapSize] = useState({ w: 0, h: 0 })

  const group = groups[groupIndex]
  const story = group?.stories[index]

  const advance = useCallback(() => {
    if (!group) return
    if (index + 1 < group.stories.length) {
      setIndex(index + 1)
    } else if (groupIndex + 1 < groups.length) {
      setGroupIndex(groupIndex + 1)
      setIndex(0)
    } else {
      onClose()
    }
  }, [group, index, groupIndex, groups.length, onClose])

  const goBack = useCallback(() => {
    if (index > 0) setIndex(index - 1)
    else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1)
      setIndex(groups[groupIndex - 1].stories.length - 1)
    }
  }, [index, groupIndex, groups])

  // Auto-advance every 5s, like WhatsApp/Instagram.
  useEffect(() => {
    if (showReport) return
    const t = setTimeout(advance, STORY_MS)
    return () => clearTimeout(t)
  }, [advance, showReport])

  // Time remaining, refreshed every minute (computed in an effect,
  // never during render).
  useEffect(() => {
    if (!story) return
    const update = () => {
      const ms = new Date(story.expires_at).getTime() - Date.now()
      if (ms <= 0) { setRemaining('Expirada'); return }
      const mins = Math.floor(ms / 60000)
      if (mins < 60) setRemaining(`Quedan ${mins}m`)
      else setRemaining(`Quedan ${Math.floor(mins / 60)}h ${mins % 60}m`)
    }
    update()
    const t = setInterval(update, 60000)
    return () => clearInterval(t)
  }, [story])

  // Measure the image wrapper on mount + resize (event-driven, like
  // the viewer's interval effect) so overlays track the letterboxed
  // photo, not the container.
  useEffect(() => {
    const measure = () => {
      const el = imageWrapRef.current
      if (el) setWrapSize({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [story?.id])

  // Escape closes; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!group || !story) return null

  // Displayed-photo rect (letterbox math, shared with the composer).
  const rect: ImageRect = displayedImageRect(
    wrapSize.w,
    wrapSize.h,
    natural?.w ?? 0,
    natural?.h ?? 0,
  )
  const overlays = story.overlays ?? []
  const isOwner = Boolean(currentUserId && story.author_id === currentUserId)

  const removeStory = async () => {
    if (deleting) return
    if (!window.confirm('¿Eliminar esta historia?')) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/stories/${story.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setDeleteError(data?.error || 'No se pudo eliminar la historia')
        return
      }
      onStoryDeleted?.()
      onClose()
    } catch {
      setDeleteError('No se pudo eliminar la historia')
    } finally {
      setDeleting(false)
    }
  }

  const report = async (reason: string) => {
    setReportError(null)
    try {
      const res = await fetch(`/api/stories/${story.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setReportError(data?.error || 'No se pudo enviar el reporte')
        return
      }
      setReportSent(true)
    } catch {
      setReportError('No se pudo enviar el reporte')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col" role="dialog" aria-label="Historia">
      {/* Progress segments */}
      <div className="flex gap-1 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] relative z-10">
        {group.stories.map((s, i) => (
          <div key={s.id} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
            {i < index && <div className="h-full w-full bg-white" />}
            {i === index && (
              <div
                key={s.id}
                className="h-full bg-white"
                style={{
                  animation: `story-progress ${STORY_MS}ms linear forwards`,
                  // Pause the bar with the JS timer when the report
                  // panel is open — otherwise the bar fills while the
                  // story has not advanced (desync).
                  animationPlayState: showReport ? 'paused' : 'running',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Author header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 relative z-10">
        <div className="h-9 w-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold text-white overflow-hidden shrink-0">
          {group.avatarUrl ? (
            <Image src={group.avatarUrl} alt={group.displayName} width={36} height={36} className="h-full w-full object-cover" />
          ) : (
            initials(group.displayName)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{group.displayName}</p>
          <p className="text-[11px] text-white/60">{remaining ?? ''}</p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={removeStory}
            disabled={deleting}
            aria-label="Eliminar historia"
            className="h-9 px-2.5 rounded-full flex items-center gap-1 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="h-9 w-9 rounded-full flex items-center justify-center text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {deleteError && (
        <p className="px-3 pb-1 text-xs text-red-400 relative z-10">{deleteError}</p>
      )}

      {/* Image — tap right to advance, left to go back */}
      <div ref={imageWrapRef} className="relative flex-1 min-h-0">
        <Image
          src={story.image_url}
          alt={`Historia de ${group.displayName}`}
          fill
          className="object-contain"
          sizes="100vw"
          priority
          onLoadingComplete={({ naturalWidth, naturalHeight }) =>
            setNatural({ w: naturalWidth, h: naturalHeight })
          }
        />
        <button type="button" aria-label="Anterior" onClick={goBack} className="absolute inset-y-0 left-0 w-1/3" />
        <button type="button" aria-label="Siguiente" onClick={advance} className="absolute inset-y-0 right-0 w-2/3" />
        {/* Placeable overlays (migration 046) win over the caption
            chip (migration 045) — one text, one place. Both are
            pointer-events-none so the tap zones keep working. */}
        {overlays.length > 0 ? (
          overlays.map((o) => {
            const emoji = isEmojiOnly(o.text)
            return (
              <div
                key={o.id}
                className="pointer-events-none absolute z-10"
                style={overlayStyle(o, rect)}
              >
                <span
                  className={
                    emoji
                      ? 'block leading-none'
                      : 'block rounded-full bg-black/60 px-3 py-1 text-center font-semibold text-white whitespace-nowrap'
                  }
                  style={{ fontSize: overlayBaseFontSize(o) }}
                >
                  {o.text}
                </span>
              </div>
            )
          })
        ) : story.caption ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p className="rounded-full bg-black/60 px-4 py-2 text-center text-sm font-medium text-white">
              {story.caption}
            </p>
          </div>
        ) : null}
      </div>

      {/* Link chip + report */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] relative z-10">
        {story.listing_id ? (
          <Link
            href={`/listings/${story.listing_id}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-white text-gray-900 text-sm font-semibold py-2.5"
          >
            Ver anuncio <ExternalLink className="h-4 w-4" />
          </Link>
        ) : story.business_id ? (
          <Link
            href={`/businesses/${story.business_id}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-white text-gray-900 text-sm font-semibold py-2.5"
          >
            Ver negocio <ExternalLink className="h-4 w-4" />
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        <button
          type="button"
          onClick={() => { setShowReport((v) => !v); setReportSent(false); setReportError(null) }}
          className="h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0"
          aria-label="Reportar historia"
        >
          <Flag className="h-4 w-4" />
        </button>
      </div>

      {/* Report panel — a report opens a review, it never hides the story */}
      {showReport && (
        <div className="px-3 pb-[max(1rem,env(safe-area-inset-bottom))] relative z-10">
          <div className="rounded-xl bg-white p-3">
            {reportSent ? (
              <p className="text-sm text-gray-900">Gracias, revisaremos esta historia.</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-900 mb-2">¿Por qué reportas esta historia?</p>
                <div className="flex flex-wrap gap-2">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => report(r.id)}
                      className="px-3 py-1.5 rounded-full border text-xs font-medium text-gray-700 hover:border-gray-900"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {reportError && <p className="text-xs text-red-600 mt-2">{reportError}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
