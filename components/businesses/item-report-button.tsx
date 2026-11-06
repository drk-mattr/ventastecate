// Items engine — "¿Esto está mal?" for an offering (§4, v1.1).
//
// A report OPENS A REVIEW. It never hides the offering: no trigger
// in migration 034 changes any item status when a report is inserted,
// and this button does not change anything locally either. Mirrors
// the ContributionFlag pattern. Logged-out users are sent to sign in.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'

export function ItemReportButton({ itemId, businessId }: { itemId: string; businessId: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  if (state === 'done') {
    return <span className="text-xs text-gray-400">Gracias, lo revisaremos.</span>
  }

  const report = async () => {
    if (!user) {
      router.push(`/login?redirect=/businesses/${businessId}`)
      return
    }
    setState('sending')
    const res = await fetch(`/api/items/${itemId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'incorrecto' }),
    })
    if (!res.ok) {
      setState('error')
      return
    }
    setState('done')
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={report}
        disabled={state === 'sending'}
        className="text-xs text-gray-400 underline hover:text-gray-600 disabled:opacity-50"
      >
        ¿Esto está mal?
      </button>
      {state === 'error' && <span className="text-xs text-red-600">No se pudo reportar</span>}
    </span>
  )
}
