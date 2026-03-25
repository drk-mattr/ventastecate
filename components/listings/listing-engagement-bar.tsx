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
}

export function ListingEngagementBar({ listingId, likesCount, savesCount }: ListingEngagementBarProps) {
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

  return (
    <div className="flex items-center gap-4 py-3 border-t border-b my-4">
      <LikeButton
        listingId={listingId}
        initialLiked={userLiked}
        initialCount={likesCount}
        size="md"
      />
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm transition-colors"
        aria-label="Compartir"
      >
        <Share2 className="h-5 w-5" />
        <span>Compartir</span>
      </button>
      <div className="ml-auto">
        <SaveButton
          listingId={listingId}
          initialSaved={userSaved}
          initialCount={savesCount}
          size="md"
        />
      </div>
    </div>
  )
}
