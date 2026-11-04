'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function ReportActions({ reportId, status, hasEmail }: { reportId: string; status: string; hasEmail: boolean }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [reply, setReply] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const call = async (payload: object) => {
    setBusy(true); setMsg('')
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Error')
      setMsg('Guardado.')
      setNote(''); setReply('')
      router.refresh()
    } catch (e) { setMsg((e as Error).message) } finally { setBusy(false) }
  }

  const setStatus = async (s: string) => {
    setBusy(true); setMsg('')
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) })
      if (!res.ok) throw new Error('Error al cambiar estado')
      router.refresh()
    } catch (e) { setMsg((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5 border-t pt-5">
      <div>
        <Label className="text-sm font-medium text-gray-700">Estado</Label>
        <div className="flex gap-2 mt-2">
          {(['new', 'reviewed', 'resolved'] as const).map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${status === s ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200'}`}>
              {s === 'new' ? 'Nuevo' : s === 'reviewed' ? 'En revisión' : 'Resuelto'}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-note" className="text-sm font-medium text-gray-700">Nota interna (no se envía al usuario)</Label>
        <Textarea id="admin-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Qué se revisó, qué falta, en qué PR se arregla…" className="rounded-xl" />
        <Button disabled={busy || !note.trim()} onClick={() => call({ action: 'note', body: note })} size="sm" className="rounded-full">Guardar nota</Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-reply" className="text-sm font-medium text-gray-700">Responder al usuario por correo</Label>
        <Textarea id="admin-reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Gracias por avisar, ya lo revisamos…" className="rounded-xl" disabled={!hasEmail} />
        {!hasEmail && <p className="text-xs text-gray-500">Este reporte no tiene email, así que no se puede responder por correo.</p>}
        <Button disabled={busy || !reply.trim() || !hasEmail} onClick={() => call({ action: 'reply', body: reply })} size="sm" className="rounded-full">Enviar respuesta</Button>
      </div>
      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </div>
  )
}
