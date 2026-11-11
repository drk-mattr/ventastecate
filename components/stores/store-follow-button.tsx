'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'

interface StoreFollowButtonProps {
  storeId: string
  initialFollowing?: boolean
  /** The store owner's profile id — when set and equal to the viewer, the button hides (no self-follow). */
  ownerId?: string
}

/**
 * Follow a store. Same shape as the business follow in
 * components/businesses/business-engagement-bar.tsx: direct
 * supabase calls on the follow table (no API route — there is
 * none for business follows either), optimistic toggle, revert
 * on error, router.refresh() so the server-rendered follower
 * count moves.
 *
 * Self-follow is hidden, not allowed: when the viewer is the
 * store's owner (ownerId prop), the button renders nothing —
 * same as the profile FollowButton. The business bar has no such
 * guard, but a store is a posting identity, not a listing to save.
 *
 * The initialFollowing sync effect keeps two mounted instances
 * (sidebar rail on desktop, byline on mobile) consistent after
 * a toggle + refresh.
 */
export function StoreFollowButton({ storeId, initialFollowing = false, ownerId }: StoreFollowButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)

  useEffect(() => {
    setFollowing(initialFollowing)
  }, [initialFollowing])

  // No self-follow: the owner already owns the store — a Seguir
  // button next to their own Editar Tienda is noise. (Profile
  // FollowButton hides for self the same way; the business bar does
  // not, but a store is a posting identity, not a listing to save.)
  if (user?.id && ownerId && user.id === ownerId) return null

  const toggleFollow = async () => {
    if (!user) {
      router.push('/login')
      return
    }
    setFollowing(!following)
    const supabase = createClient()
    const { error } = following
      ? await supabase.from('store_follows').delete().eq('store_id', storeId).eq('follower_id', user.id)
      : await supabase.from('store_follows').insert({ store_id: storeId, follower_id: user.id })
    if (error) {
      setFollowing(following)
    } else {
      router.refresh()
    }
  }

  return (
    <button
      onClick={toggleFollow}
      className={`h-8 px-4 rounded-full text-xs font-medium transition-colors shrink-0 ${
        following
          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          : 'bg-black text-white hover:bg-gray-800'
      }`}
    >
      {following ? 'Siguiendo' : 'Seguir'}
    </button>
  )
}
