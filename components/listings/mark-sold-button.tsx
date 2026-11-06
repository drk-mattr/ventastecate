'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

type MarkSoldButtonProps = {
  listingId: string
  /** Current status of the listing. */
  initialSold: boolean
  /** Extra classes for the button (e.g. 'w-full'). */
  className?: string
}

/**
 * Sold loop — the prominent one-tap "Marcar como vendido" control.
 * OfferUp's liquidity metric (% sold + time-to-sell) only exists
 * because sellers tap a sold button; here the status dropdown buried
 * in the Edit form was the only path. One tap marks the listing sold
 * (or reactivates it — a mistaken tap is reversible in one tap),
 * then refreshes the server-rendered page so tabs/badges update.
 *
 * Monochrome: black primary when active, outline when sold.
 * Orange-600 stays Publish-only.
 */
export function MarkSoldButton({ listingId, initialSold, className = '' }: MarkSoldButtonProps) {
  const router = useRouter()
  const [sold, setSold] = useState(initialSold)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}/sold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sold: !sold }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error || 'No se pudo actualizar el anuncio')
      }
      setSold(!sold)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el anuncio')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={className}>
      {sold ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
            <Check className="h-4 w-4" /> Vendido
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={toggle}
            disabled={pending}
            className="w-full"
          >
            {pending ? 'Actualizando…' : 'Volver a activar'}
          </Button>
        </div>
      ) : (
        <Button type="button" onClick={toggle} disabled={pending} className="w-full">
          {pending ? 'Actualizando…' : 'Marcar como vendido'}
        </Button>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
