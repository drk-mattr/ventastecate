'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Facebook trust item for the /cuenta hub. The identity check only
 * works for the signed-in user, so it runs client-side — the same
 * getUserIdentities() call /profile/edit already uses. Renders
 * nothing at all when Facebook is not linked: the trust row shows
 * only true facts, never an incomplete item dressed up as a claim.
 */
export function FacebookTrustItem() {
  const [linked, setLinked] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .auth
      .getUserIdentities()
      .then(({ data }) => {
        setLinked((data?.identities || []).some((i) => i.provider === 'facebook'))
      })
  }, [])

  if (!linked) return null

  return (
    <li className="flex items-center gap-1">
      <Check className="h-3.5 w-3.5 text-gray-900" />
      Facebook vinculada
    </li>
  )
}
