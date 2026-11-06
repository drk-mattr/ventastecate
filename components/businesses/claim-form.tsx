'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

// Ask to claim a business page. V1 is manual review: the moderator
// approves from /admin/claim-requests. No code is sent yet.
export function ClaimForm({ businessId, alreadyPending }: { businessId: string; alreadyPending: boolean }) {
  const { user } = useAuth()
  const router = useRouter()
  const [ownerName, setOwnerName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  if (!user) {
    return (
      <p className="text-sm text-gray-500">
        <a href={`/login?redirect=/businesses/${businessId}/reclamar`} className="text-gray-900 underline">Inicia sesión</a> para reclamar este negocio.
      </p>
    )
  }

  if (sent || alreadyPending) {
    return (
      <div className="border rounded-xl p-6 text-center">
        <p className="font-medium text-gray-900">Solicitud enviada</p>
        <p className="text-sm text-gray-500 mt-1">
          El equipo la revisará. Cuando se apruebe, la página mostrará que el negocio fue reclamado.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/businesses/${businessId}`)}
          className="mt-4 text-sm text-gray-900 underline"
        >
          Volver al negocio
        </button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (whatsapp.trim().length < 6) { setError('Escribe tu número de WhatsApp'); return }
    setLoading(true); setError('')
    const res = await fetch(`/api/businesses/${businessId}/claim-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_name: ownerName, whatsapp_number: whatsapp, note }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((data as { error?: string }).error || 'No se pudo enviar la solicitud')
      setLoading(false)
      return
    }
    setSent(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="claim-name" className="text-sm">Tu nombre</Label>
        <Input id="claim-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Ej: María González" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="claim-whatsapp" className="text-sm">WhatsApp del negocio</Label>
        <Input id="claim-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Ej: 665 123 4567" inputMode="tel" />
        <p className="text-xs text-gray-400">Lo usamos para verificar que el negocio es tuyo.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="claim-note" className="text-sm">Algo que nos ayude a verificarlo (opcional)</Label>
        <textarea
          id="claim-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: atiendo el puesto de lunes a sábado"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Enviar solicitud'}</Button>
    </form>
  )
}
