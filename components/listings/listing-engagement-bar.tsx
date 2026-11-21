'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth/auth-context'
import { LikeButton } from '@/components/listings/like-button'
import { SaveButton } from '@/components/listings/save-button'
import { Check, Share } from 'lucide-react'

interface ListingEngagementBarProps {
  listingId: string
  likesCount: number
  savesCount: number
  // 'byline' (2026-11-17): the icons live in the article byline
  // row — no padding, no hairlines, lighter 1.8 stroke. 'article'
  // is the repeated bottom row; 'bar' is the product/event detail.
  // 'bare' (2026-11-20): docked into a title row — no hairline,
  // no padding, same icons.
  variant?: 'bar' | 'article' | 'byline'
  bare?: boolean
}

export function ListingEngagementBar({ listingId, likesCount, savesCount, variant = 'bar', bare = false }: ListingEngagementBarProps) {
  const { user } = useAuth()
  const [userLiked, setUserLiked] = useState(false)
  const [userSaved, setUserSaved] = useState(false)
  // Share feedback: the button used to copy the link silently, so a
  // tap looked like nothing happened. Show a check for 2s on success.
  const [shared, setShared] = useState(false)
  const sharedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (sharedTimer.current) clearTimeout(sharedTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!user) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    Promise.all([
      supabase
        .from('listing_likes')
        .select('id')
        .eq('listing_id', listingId)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('listing_saves')
        .select('id')
        .eq('listing_id', listingId)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]).then(([likeRes, saveRes]) => {
      setUserLiked(!!likeRes.data)
      setUserSaved(!!saveRes.data)
    })
  }, [user, listingId])

  const flashShared = () => {
    setShared(true)
    if (sharedTimer.current) clearTimeout(sharedTimer.current)
    sharedTimer.current = setTimeout(() => setShared(false), 2000)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/listings/${listingId}`
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url })
        flashShared()
        return
      } catch (err) {
        // User cancelled the sheet — nothing to do. Any other
        // failure falls through to copying the link instead.
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      flashShared()
    } catch {
      // Clipboard unavailable (permissions) — leave the button as-is.
    }
  }

  const article = variant === 'article'
  const byline = variant === 'byline'
  // Article variant (news detail, Medium pattern): no pills, no
  // background — plain gray icons on the hairline row, same
  // monochrome like/save states as the other variants. The byline
  // variant is the same icons with no row of their own: they sit
  // in the byline row, so no padding and no hairlines.
  const pill = article || byline
    ? 'inline-flex items-center'
    : 'inline-flex h-9 items-center rounded-full px-3 hover:bg-gray-50 transition-colors'
  // Lighter stroke (1.8) on every article-surface icon — the
  // preview's thinner icons read quieter next to the byline.
  // The product/event 'bar' keeps stroke 2.
  const iconStroke = article || byline ? 1.8 : 2

  return (
    <div className={
      byline
        ? 'flex items-center gap-4'
        : article
          ? 'flex items-center gap-5 py-3 border-y border-gray-100'
          : bare
            ? 'flex items-center gap-1'
            : 'flex items-center gap-1 pt-3 mt-1 border-t'
    }>
      <span className={pill}>
        <LikeButton
          key={`${listingId}-like-${userLiked}`}
          listingId={listingId}
          initialLiked={userLiked}
          initialCount={likesCount}
          size="md"
          strokeWidth={iconStroke}
        />
      </span>
      <span className={pill}>
        <SaveButton
          key={`${listingId}-save-${userSaved}`}
          listingId={listingId}
          initialSaved={userSaved}
          initialCount={savesCount}
          size="md"
          strokeWidth={iconStroke}
        />
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); handleShare() }}
        className={`${pill} ${shared ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        aria-label={shared ? 'Enlace copiado' : 'Compartir'}
        title={shared ? 'Enlace copiado' : 'Compartir'}
      >
        {shared ? (
          <Check className="h-5 w-5" strokeWidth={iconStroke} />
        ) : (
          <Share className="h-5 w-5" strokeWidth={iconStroke} />
        )}
      </button>
    </div>
  )
}
