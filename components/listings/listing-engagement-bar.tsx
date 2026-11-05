'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth/auth-context'
import { LikeButton } from '@/components/listings/like-button'
import { SaveButton } from '@/components/listings/save-button'
import { Share2 } from 'lucide-react'

interface ListingEngagementBarProps {
  listingId: string
  likesCount: number
  savesCount: number
  variant?: 'bar' | 'overlay'
}

export function ListingEngagementBar({ listingId, likesCount, savesCount, variant = 'bar' }: ListingEngagementBarProps) {
  const { user } = useAuth()
  const [userLiked, setUserLiked] = useState(false)
  const [userSaved, setUserSaved] = useState(false)

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

  const handleShare = () => {
    const url = `${window.location.origin}/listings/${listingId}`
    if (navigator.share) {
      navigator.share({ title: document.title, url })
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  const overlay = variant === 'overlay'
  const pill = overlay
    ? 'inline-flex h-9 items-center justify-center rounded-full bg-white/90 backdrop-blur px-2.5 shadow-sm hover:bg-white transition-colors'
    : 'inline-flex h-9 items-center rounded-full px-3 hover:bg-gray-50 transition-colors'

  return (
    <div className={overlay ? 'flex items-center gap-1.5' : 'flex items-center gap-1 pt-3 mt-1 border-t'}>
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
        className={`${pill} text-gray-400 hover:text-gray-600`}
        aria-label="Compartir"
        title="Compartir"
      >
        <Share2 className="h-5 w-5" />
      </button>
    </div>
  )
}
