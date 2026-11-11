'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth/auth-context'
import { LikeButton } from '@/components/listings/like-button'
import { SaveButton } from '@/components/listings/save-button'
import { Check, Share2 } from 'lucide-react'

interface ListingEngagementBarProps {
  listingId: string
  likesCount: number
  savesCount: number
  variant?: 'bar' | 'article'
}

export function ListingEngagementBar({ listingId, likesCount, savesCount, variant = 'bar' }: ListingEngagementBarProps) {
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
  // Article variant (news detail, Medium pattern): no pills, no
  // background — plain gray icons on the hairline row, same
  // monochrome like/save states as the other variants.
  const pill = article
    ? 'inline-flex items-center'
    : 'inline-flex h-9 items-center rounded-full px-3 hover:bg-gray-50 transition-colors'

  return (
    <div className={
      article
        ? 'flex items-center gap-5 py-3 border-y border-gray-100'
        : 'flex items-center gap-1 pt-3 mt-1 border-t'
    }>
      <span className={pill}>
        <LikeButton
          key={`${listingId}-like-${userLiked}`}
          listingId={listingId}
          initialLiked={userLiked}
          initialCount={likesCount}
          size="md"
        />
      </span>
      <span className={pill}>
        <SaveButton
          key={`${listingId}-save-${userSaved}`}
          listingId={listingId}
          initialSaved={userSaved}
          initialCount={savesCount}
          size="md"
        />
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); handleShare() }}
        className={`${pill} ${shared ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        aria-label={shared ? 'Enlace copiado' : 'Compartir'}
        title={shared ? 'Enlace copiado' : 'Compartir'}
      >
        {shared ? (
          <Check className="h-5 w-5" />
        ) : (
          <Share2 className="h-5 w-5" />
        )}
      </button>
    </div>
  )
}
