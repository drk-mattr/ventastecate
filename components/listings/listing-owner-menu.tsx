'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ListingOwnerMenuProps = {
  listingId: string
  /** Current status of the listing. */
  initialSold: boolean
}

/**
 * Owner-only actions on a listing detail page, nested in a quiet
 * "Opciones" menu instead of the old full-width "Marcar como
 * vendido" button. The sold toggle is the same one-tap flow as
 * MarkSoldButton (same endpoint, same sold_at handling, same
 * /admin/liquidity tracking) — only the chrome changed. A mistaken
 * tap stays reversible: a sold listing offers "Volver a activar".
 *
 * Monochrome: ghost trigger, plain menu items. Orange-600 stays
 * Publish-only.
 */
export function ListingOwnerMenu({ listingId, initialSold }: ListingOwnerMenuProps) {
  const router = useRouter()
  const [sold, setSold] = useState(initialSold)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggleSold() {
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
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900 px-2">
            <MoreHorizontal className="h-4 w-4" />
            Opciones
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault()
              void toggleSold()
            }}
          >
            {pending ? 'Actualizando…' : sold ? 'Volver a activar' : 'Marcar como vendido'}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/listings/${listingId}/edit`}>Editar Anuncio</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
