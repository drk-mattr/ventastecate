'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ClaimRequestActions({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState('')

  const act = async (action: 'approve' | 'reject') => {
    setBusy(action); setError('')
    const res = await fetch('/api/admin/claim-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: requestId, action }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((data as { error?: string }).error || 'No se pudo actualizar la solicitud')
      setBusy(null)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => act('approve')}
        disabled={busy !== null}
        className="rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {busy === 'approve' ? 'Aprobando…' : 'Aprobar'}
      </button>
      <button
        type="button"
        onClick={() => act('reject')}
        disabled={busy !== null}
        className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 disabled:opacity-50"
      >
        {busy === 'reject' ? 'Rechazando…' : 'Rechazar'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
