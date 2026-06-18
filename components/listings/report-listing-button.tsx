'use client'

import { useState } from 'react'
import { Flag, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const REASONS = [
  { value: 'spam', label: '🚫 Spam o duplicado' },
  { value: 'scam', label: '⚠️ Fraude o estafa' },
  { value: 'prohibited', label: '🚷 Artículo prohibido' },
  { value: 'offensive', label: '😡 Contenido ofensivo' },
  { value: 'listing_other', label: '📝 Otro motivo' },
]

export function ReportListingButton({
  listingId,
  listingTitle,
}: {
  listingId: string
  listingTitle: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('spam')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
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
        body: JSON.stringify({
          type: reason,
          description: description || undefined,
          email: email || undefined,
          listingId,
          listingTitle,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al enviar el reporte')
      }
      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setSent(false)
    setReason('spam')
    setDescription('')
    setEmail('')
    setError('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Flag className="h-3 w-3" />
          Reportar este anuncio
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Gracias por avisar</h2>
            <p className="text-sm text-gray-500 mb-6">
              Recibimos tu reporte y lo revisaremos lo antes posible.
            </p>
            <Button onClick={() => setOpen(false)} variant="outline" size="sm">
              Cerrar
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Reportar este anuncio</DialogTitle>
              <DialogDescription>
                Ayúdanos a mantener Ventas Tecate seguro. Cuéntanos qué pasa con este anuncio.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-reason">Motivo</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="report-reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-details">Detalles (opcional)</Label>
                <Textarea
                  id="report-details"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el problema con este anuncio..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-email">Email para seguimiento (opcional)</Label>
                <Input
                  id="report-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Enviando...' : 'Enviar reporte'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
