'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface FollowButtonProps {
  profileId: string
  username: string
  initialIsFollowing?: boolean
}

export function FollowButton({ profileId, username, initialIsFollowing = false }: FollowButtonProps) {
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
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      className="h-8 px-4 text-xs"
    >
      {loading ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
    </Button>
  )
}
