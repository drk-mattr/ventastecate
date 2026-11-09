'use client'

import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { formatVideoDuration } from '@/lib/video/validate'

interface VideoPlayerProps {
  /** Public URL of the clip in the `listing-videos` bucket. */
  src: string
  posterUrl?: string | null
  durationSeconds?: number | null
  title?: string
  /**
   * Feed mode: muted autoplay when the player scrolls into view
   * (the Nextdoor pattern), tap for sound. Detail mode renders
   * with controls and no autoplay.
   */
  autoplayInView?: boolean
  className?: string
}

/**
 * Native `<video>` player for uploaded news clips. Monochrome by
 * design — no colored play button, no brand colors (the platform
 * brand colors in video-embed.tsx are the link path's exception,
 * not this component's). Never autoplay with sound, never loop.
 *
 * Caveat (proposal §3a): Supabase Storage does not parse Range
 * headers, so a natively served clip cannot be scrubbed — the
 * viewer plays from the start. Acceptable for a <=60s clip;
 * Cloudflare Stream is the P1 fix.
 */
export function VideoPlayer({
  src,
  posterUrl,
  durationSeconds,
  title,
  autoplayInView = false,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [muted, setMuted] = useState(true)
  const [showTapForSound, setShowTapForSound] = useState(false)
  const durationLabel = formatVideoDuration(durationSeconds)

  // Muted autoplay when visible: the video starts silently as it
  // scrolls into view and pauses when it leaves, so the feed never
  // plays sound uninvited and never burns data off-screen.
  useEffect(() => {
    if (!autoplayInView) return
    const video = videoRef.current
    const container = containerRef.current
    if (!video || !container || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting) {
          setShowTapForSound(true)
          video.play().catch(() => {
            // Autoplay blocked (browser policy) — the poster and
            // the tap-to-play affordance below still work.
          })
        } else {
          video.pause()
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [autoplayInView])

  const unmute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = false
    setMuted(false)
    setShowTapForSound(false)
    video.play().catch(() => {})
  }

  // In feed mode the player lives inside the card link — a tap on
  // the video unmutes (or toggles) instead of navigating to the
  // detail page; the title below the player is still the link.
  const stopNav = autoplayInView ? (e: React.MouseEvent) => e.stopPropagation() : undefined

  return (
    <div
      ref={containerRef}
      onClick={stopNav}
      className={`relative overflow-hidden bg-black ${className ?? ''}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={posterUrl ?? undefined}
        playsInline
        preload="metadata"
        muted={muted}
        controls={!autoplayInView}
        loop={false}
        aria-label={title ? `Video: ${title}` : 'Video'}
        className="block h-full w-full object-contain"
        onClick={autoplayInView && muted ? unmute : undefined}
      />
      {autoplayInView && muted && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            unmute()
          }}
          aria-label="Reproducir con sonido"
          className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-white"
        >
          <Play className="h-3 w-3 fill-current" />
          {showTapForSound ? 'Toca para sonido' : 'Video'}
        </button>
      )}
      {durationLabel && (
        <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {durationLabel}
        </span>
      )}
    </div>
  )
}
