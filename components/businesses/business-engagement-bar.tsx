'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  businessId: string
  initialFollowing: boolean
  initialLiked: boolean
  followersCount: number
  likesCount: number
}

export function BusinessEngagementBar({ businessId, initialFollowing, initialLiked, followersCount, likesCount }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [liked, setLiked] = useState(initialLiked)
  const [followers, setFollowers] = useState(followersCount)
  const [likes, setLikes] = useState(likesCount)

  const toggle = async (table: 'business_follows' | 'business_likes', was: boolean, set: (v: boolean) => void, setCount: (f: (n: number) => number) => void) => {
    if (!user) { router.push('/login'); return }
    set(!was); setCount((n) => was ? Math.max(n - 1, 0) : n + 1)
    const supabase = createClient()
    const { error } = was
      ? await supabase.from(table).delete().eq('business_id', businessId).eq('user_id', user.id)
      : await supabase.from(table).insert({ business_id: businessId, user_id: user.id })
    if (error) { set(was); setCount((n) => was ? n + 1 : Math.max(n - 1, 0)) }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={following ? 'secondary' : 'outline'}
        size="sm"
        onClick={() => toggle('business_follows', following, setFollowing, setFollowers)}
      >
        {following ? 'Siguiendo' : 'Seguir'}
      </Button>
      <span className="text-xs text-gray-500">{followers} {followers === 1 ? 'seguidor' : 'seguidores'}</span>
      <button
        onClick={() => toggle('business_likes', liked, setLiked, setLikes)}
        className={`flex items-center gap-1 text-sm ${liked ? 'text-gray-900' : 'text-gray-400 hover:text-gray-900'}`}
        aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
      >
        <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
        {likes > 0 && <span className="tabular-nums">{likes}</span>}
      </button>
    </div>
  )
}
