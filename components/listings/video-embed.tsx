'use client'

import { useState } from 'react'
import { Play, ExternalLink } from 'lucide-react'

interface VideoEmbedProps {
  url: string
  title?: string
  /** Compact mode for use inside grid cards */
  compact?: boolean
}

type VideoInfo = {
  platform: 'youtube' | 'facebook' | 'tiktok' | 'unknown'
  embedUrl: string | null
  videoId: string | null
  thumbnailUrl: string | null
}

/**
 * Parse a video URL and extract platform-specific embed info.
 */
function parseVideoUrl(url: string): VideoInfo {
  try {
    const u = new URL(url)

    // ── YouTube ──────────────────────────────────────────────
    // youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId: string | null = null

      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1).split('/')[0]
      } else if (u.pathname.startsWith('/watch')) {
        videoId = u.searchParams.get('v')
      } else if (u.pathname.startsWith('/shorts/')) {
        videoId = u.pathname.split('/shorts/')[1]?.split('/')[0] || null
      } else if (u.pathname.startsWith('/embed/')) {
        videoId = u.pathname.split('/embed/')[1]?.split('/')[0] || null
      }

      if (videoId) {
        return {
          platform: 'youtube',
          videoId,
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        }
      }
    }

    // ── Facebook ─────────────────────────────────────────────
    // facebook.com/watch, fb.watch, facebook.com/.../videos/ID
    if (u.hostname.includes('facebook.com') || u.hostname.includes('fb.watch') || u.hostname.includes('fb.com')) {
      return {
        platform: 'facebook',
        videoId: null,
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=560`,
        thumbnailUrl: null,
      }
    }

    // ── TikTok ───────────────────────────────────────────────
    // tiktok.com/@user/video/ID, vm.tiktok.com/ID
    if (u.hostname.includes('tiktok.com')) {
      const videoMatch = u.pathname.match(/\/video\/(\d+)/)
      const videoId = videoMatch ? videoMatch[1] : null

      if (videoId) {
        return {
          platform: 'tiktok',
          videoId,
          embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
          thumbnailUrl: null,
        }
      }

      // Short link (vm.tiktok.com) — can't resolve without a fetch, so just link
      return {
        platform: 'tiktok',
        videoId: null,
        embedUrl: null,
        thumbnailUrl: null,
      }
    }

    return { platform: 'unknown', videoId: null, embedUrl: null, thumbnailUrl: null }
  } catch {
    return { platform: 'unknown', videoId: null, embedUrl: null, thumbnailUrl: null }
  }
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  unknown: 'Video',
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-600',
  facebook: 'bg-blue-600',
  tiktok: 'bg-gray-900',
  unknown: 'bg-gray-600',
}

export function VideoEmbed({ url, title, compact = false }: VideoEmbedProps) {
  const [loaded, setLoaded] = useState(false)
  const info = parseVideoUrl(url)

  // ── Compact mode: small indicator for grid cards ──
  if (compact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1 text-[10px] font-medium text-white px-1.5 py-0.5 rounded ${PLATFORM_COLORS[info.platform]}`}
      >
        <Play className="h-2.5 w-2.5 fill-current" />
        {PLATFORM_LABELS[info.platform]}
      </a>
    )
  }

  // ── Full embed: YouTube gets native iframe ──
  if (info.platform === 'youtube' && info.embedUrl) {
    return (
      <div className="rounded-lg overflow-hidden border bg-black">
        {!loaded && info.thumbnailUrl ? (
          // Lazy load: show thumbnail with play button, load iframe on click
          <button
            onClick={() => setLoaded(true)}
            className="relative w-full aspect-video group cursor-pointer"
            aria-label={`Reproducir video: ${title || 'YouTube'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={info.thumbnailUrl}
              alt={title || 'Video thumbnail'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="h-7 w-7 text-white fill-white ml-1" />
              </div>
            </div>
          </button>
        ) : (
          <div className="relative w-full aspect-video">
            <iframe
              src={`${info.embedUrl}&autoplay=${loaded ? 1 : 0}`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title || 'YouTube video'}
            />
          </div>
        )}
      </div>
    )
  }

  // ── Facebook embed ──
  if (info.platform === 'facebook' && info.embedUrl) {
    return (
      <div className="rounded-lg overflow-hidden border">
        <div className="relative w-full aspect-video">
          <iframe
            src={info.embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            title={title || 'Facebook video'}
          />
        </div>
      </div>
    )
  }

  // ── TikTok embed ──
  if (info.platform === 'tiktok' && info.embedUrl) {
    return (
      <div className="rounded-lg overflow-hidden border bg-black flex justify-center">
        <div className="w-full max-w-[325px] aspect-[9/16]">
          <iframe
            src={info.embedUrl}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={title || 'TikTok video'}
          />
        </div>
      </div>
    )
  }

  // ── Fallback: external link card ──
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${PLATFORM_COLORS[info.platform]}`}>
        <Play className="h-5 w-5 text-white fill-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {PLATFORM_LABELS[info.platform]} Video
        </p>
        <p className="text-xs text-gray-400 truncate">{url}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
    </a>
  )
}
