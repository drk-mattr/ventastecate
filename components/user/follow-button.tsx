'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

interface FollowButtonProps {
  profileId: string
  initialIsFollowing?: boolean
  // quiet: smaller outline button for the publication rail (and the
  // byline, which shares the same control) — the solid charcoal
  // button reads too big and in the way there.
  quiet?: boolean
}

export function FollowButton({ profileId, initialIsFollowing = false, quiet = false }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (user && user.id !== profileId) {
      checkFollowStatus()
    }
  }, [user, profileId])

  // Keep two mounted instances (sidebar rail + byline) in sync: after
  // a toggle + router.refresh(), the server passes the new value back
  // in initialIsFollowing and this effect applies it. On mount the
  // async check above lands after this and wins when no prop is passed.
  useEffect(() => {
    setIsFollowing(initialIsFollowing)
  }, [initialIsFollowing])

  const checkFollowStatus = async () => {
    if (!user) return

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profileId)
      .single()

    setIsFollowing(!!data)
  }

  const handleFollow = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    setLoading(true)

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profileId)

        if (error) throw error
        setIsFollowing(false)
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: profileId,
          })

        if (error) throw error
        setIsFollowing(true)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setLoading(false)
      router.refresh()
    }
  }

  // Don't show button if viewing own profile
  if (user?.id === profileId) {
    return null
  }

  return (
    <Button
      onClick={handleFollow}
      disabled={loading}
      variant={quiet || isFollowing ? 'outline' : 'default'}
      size="sm"
      className={quiet ? 'h-6 px-2.5 text-[10px] gap-1.5' : 'h-8 px-4 text-xs gap-1.5'}
    >
      {loading ? '...' : isFollowing ? (<><Check className="h-3 w-3" />Siguiendo</>) : 'Seguir'}
    </Button>
  )
}
