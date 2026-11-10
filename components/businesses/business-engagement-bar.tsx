'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { ContactBusinessButton } from '@/components/messages/contact-business-button'

interface Props {
  businessId: string
  businessName: string
  initialFollowing: boolean
  /** businesses.claimed_by — null while the business is unclaimed. */
  claimedBy: string | null
  /** The viewer is the claimed owner. */
  isOwner: boolean
}

export function BusinessEngagementBar({ businessId, businessName, initialFollowing, claimedBy, isOwner }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)

  const toggleFollow = async () => {
    if (!user) { router.push('/login'); return }
    setFollowing(!following)
    const supabase = createClient()
    const { error } = following
      ? await supabase.from('business_follows').delete().eq('business_id', businessId).eq('user_id', user.id)
      : await supabase.from('business_follows').insert({ business_id: businessId, user_id: user.id })
    if (error) { setFollowing(following) }
  }

  return (
    <div className="flex items-center gap-3">
      <ContactBusinessButton businessId={businessId} businessName={businessName} claimedBy={claimedBy} isOwner={isOwner} />
      <button
        onClick={toggleFollow}
        className={`h-7 px-3 rounded-full text-xs font-medium transition-colors ${
          following
            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
        }`}
      >
        {following ? 'Siguiendo' : 'Seguir'}
      </button>
    </div>
  )
}
