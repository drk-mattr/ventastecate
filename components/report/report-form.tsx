'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTranslations } from '@/lib/hooks/use-translations'

/**
 * Shared report/feedback form used by both the /report page and the popup modal.
 * One field: the user just tells us what happened. Always sent as type 'other'.
 */
export function ReportForm({ hideTitle = false }: { hideTitle?: boolean } = {}) {
  const t = useTranslations()
  const f = t.forms

  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // Prefill the follow-up email for logged-in users; still editable, still optional.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail((cur) => cur || user.email || '')
    }).catch(() => {})
  }, [])
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'other', description, email: email || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al enviar')
      }
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="py-6 text-center">
        <h2 className="text-lg font-semibold mb-2">{f.reportThankYou}</h2>
        <p className="text-sm text-gray-500 mb-6">{f.reportReceived}</p>
        <Button onClick={() => { setSent(false); setDescription(''); setEmail('') }} variant="outline" size="sm" className="rounded-full">
          {f.reportSendAnother}
        </Button>
      </div>
    )
  }

  return (
    <div>
      {!hideTitle && (<>
        <h2 className="text-xl font-semibold mb-1">{f.reportTitle}</h2>
        <p className="text-sm text-gray-500 mb-5">{f.reportDesc}</p>
      </>)}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="report-description" className="text-sm font-medium text-gray-700">{f.reportDescLabel}</Label>
          <Textarea
            id="report-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder={f.reportDescPlaceholder}
            rows={5}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-email" className="text-sm font-medium text-gray-700">{f.reportEmailLabel}</Label>
          <Input
            id="report-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="h-11 rounded-xl text-[15px]"
          />
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</div>}

        <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl text-sm font-medium">
          {loading ? f.reportSubmitting : f.reportSubmit}
        </Button>
      </form>
    </div>
  )
}
