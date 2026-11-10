'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

// Hide/restore for a flagged border post, on the report detail
// page. Calls the superadmin-guarded admin route (the browser
// has no internal token). Hide is reversible only — it sets
// hidden_at so the post leaves the feed and the estimate;
// restore clears it. Reason required, logged to moderation_log.
export function BorderReportActions({
  borderReportId,
  hidden,
  hiddenAt,
}: {
  borderReportId: string
  hidden: boolean
  hiddenAt: string | null
}) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const act = async (action: 'hide' | 'restore') => {
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/border-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          border_report_id: borderReportId,
          action,
          reason: reason.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Error')
      setMsg(action === 'hide' ? 'Reporte oculto del feed.' : 'Reporte restaurado en el feed.')
      setReason('')
      router.refresh()
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 border rounded-xl p-4">
      <p className="text-sm font-medium text-gray-800">
        {hidden
          ? `Oculto del feed${hiddenAt ? ` desde ${new Date(hiddenAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.`
          : 'Visible en el feed.'}
      </p>
      <div className="space-y-2">
        <Label htmlFor="border-moderate-reason" className="text-sm font-medium text-gray-700">
          Motivo (obligatorio, queda registrado)
        </Label>
        <Textarea
          id="border-moderate-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Ej. Foto con placas visibles, reporte falso…"
          className="rounded-xl"
        />
      </div>
      <div className="flex gap-2">
        {hidden ? (
          <Button disabled={busy || !reason.trim()} onClick={() => void act('restore')} size="sm" className="rounded-full">
            Restaurar en el feed
          </Button>
        ) : (
          <Button disabled={busy || !reason.trim()} onClick={() => void act('hide')} size="sm" className="rounded-full">
            Ocultar del feed
          </Button>
        )}
      </div>
      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </div>
  )
}
