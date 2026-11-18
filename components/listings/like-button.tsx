'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth/auth-context'
import { useRouter } from 'next/navigation'

interface LikeButtonProps {
  listingId: string
  initialLiked: boolean
  initialCount: number
  size?: 'sm' | 'md'
  // Lighter stroke for the article treatment (2026-11-17): the
  // preview's 1.8-stroke icons read quieter next to the byline.
  // Default 2 keeps every other surface exactly as-is.
  strokeWidth?: number
}

export function LikeButton({ listingId, initialLiked, initialCount, size = 'sm', strokeWidth = 2 }: LikeButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [animating, setAnimating] = useState(false)
  const [isPending, startTransition] = useTransition()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      router.push('/login')
      return
    }

    // Optimistic update
    const wasLiked = liked
    setLiked(!wasLiked)
    setCount(prev => wasLiked ? Math.max(prev - 1, 0) : prev + 1)

    if (!wasLiked) {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 400)
    }

    startTransition(async () => {
      // Supabase resolves (doesn't throw) on DB/RLS errors — the failure is in
      // the returned `error`, so we must check it explicitly to revert.
      const { error } = wasLiked
        ? await supabase
            .from('listing_likes')
            .delete()
            .eq('listing_id', listingId)
            .eq('user_id', user.id)
        : await supabase
            .from('listing_likes')
            .insert({ listing_id: listingId, user_id: user.id })

      if (error) {
        // Revert optimistic update
        setLiked(wasLiked)
        setCount(prev => wasLiked ? prev + 1 : Math.max(prev - 1, 0))
      }
    })
  }

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-1 transition-all duration-150 ${
        liked
          ? 'text-gray-900'
          : 'text-gray-400 hover:text-gray-900'
      } ${textSize}`}
      aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
    >
      <Heart
        strokeWidth={strokeWidth}
        className={`${iconSize} transition-transform duration-300 ${
          animating ? 'scale-125' : 'scale-100'
        } ${liked ? 'fill-current' : ''}`}
      />
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  )
}
