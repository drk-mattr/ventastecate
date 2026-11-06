'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'

// "¿Esto está mal?" next to a contributed value. Flags the contribution,
// reverts the value to what it was before, and files a report for the
// moderator. Logged-out users are sent to sign in first.
export function ContributionFlag({ businessId, contributionId }: { businessId: string; contributionId: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  if (state === 'done') {
    return <span className="text-xs text-gray-400">Gracias, lo revisaremos.</span>
  }

  const flag = async () => {
    if (!user) {
      router.push(`/login?redirect=/businesses/${businessId}`)
      return
    }
    setState('sending')
    const res = await fetch(`/api/businesses/${businessId}/flag-contribution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contribution_id: contributionId }),
    })
    if (!res.ok) {
      setState('error')
      return
    }
    setState('done')
    router.refresh()
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={flag}
        disabled={state === 'sending'}
        className="text-xs text-gray-400 underline hover:text-gray-600 disabled:opacity-50"
      >
        ¿Esto está mal?
      </button>
      {state === 'error' && <span className="text-xs text-red-600">No se pudo reportar</span>}
    </span>
  )
}
