'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EmailAlert } from '@/lib/types/database'

const STATUS_LABEL: Record<string, string> = { new: 'Nuevo', read: 'Leído', archived: 'Archivado' }

export function EmailAlertCard({ alert }: { alert: EmailAlert }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const setStatus = async (s: 'read' | 'archived') => {
    setBusy(true); setMsg('')
    try {
      const res = await fetch(`/api/admin/email-alerts/${alert.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) })
      if (!res.ok) throw new Error('Error al cambiar estado')
      router.refresh()
    } catch (e) { setMsg((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center gap-2 flex-wrap">
        {alert.status === 'new' && <span className="h-2 w-2 rounded-full bg-gray-900 shrink-0" aria-label="Sin leer" />}
        <span className="text-xs font-semibold truncate max-w-[60%]">{alert.from_address}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${alert.status === 'new' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[alert.status] || alert.status}</span>
        <span className="text-xs text-gray-400 ml-auto">{new Date(alert.received_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <p className="text-sm font-medium text-gray-900 mt-2">{alert.subject || '(sin asunto)'}</p>
      {alert.body && (
        <p className={`text-sm text-gray-700 mt-1 ${open ? '' : 'line-clamp-2'}`}>{alert.body}</p>
      )}
      <div className="flex items-center gap-3 mt-3">
        {alert.body && (
          <button type="button" onClick={() => setOpen(!open)} className="text-xs text-gray-500 underline underline-offset-2">
            {open ? 'Ocultar mensaje' : 'Ver mensaje'}
          </button>
        )}
        {alert.status === 'new' && (
          <button type="button" disabled={busy} onClick={() => setStatus('read')} className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 disabled:opacity-50">
            Marcar como leído
          </button>
        )}
        {alert.status !== 'archived' && (
          <button type="button" disabled={busy} onClick={() => setStatus('archived')} className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 disabled:opacity-50">
            Archivar
          </button>
        )}
      </div>
      {msg && <p className="text-sm text-gray-600 mt-2">{msg}</p>}
    </div>
  )
}
