'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'

type ContactSellerButtonProps = {
  listingId: string
  sellerId: string
  /** Seller's opt-in WhatsApp number (profiles.whatsapp_number); null hides the WhatsApp path. */
  sellerWhatsapp: string | null
  listingTitle: string
  isOwner: boolean
  /** Only active listings can be contacted. */
  isActive: boolean
  /** Primary button label; default 'Contactar Vendedor'. */
  label?: string
  size?: 'sm' | 'default'
  variant?: 'default' | 'outline'
  /** Extra classes for the wrapper (e.g. 'shrink-0', 'w-full'). */
  className?: string
}

/**
 * Messaging v2 Step 3 — the ONE place a buyer contacts a seller.
 * Used by every layout on the listing detail page (event/news and
 * the default buy-box), so the two paths never drift apart again.
 *
 * - In-site message: /messages?listing=<id>&seller=<id>. Tapping it
 *   creates NO thread — the conversation row is created together
 *   with the first message send (Step 3 rule).
 * - WhatsApp: wa.me link with the seller's opted-in number, same
 *   message text as before. Shown whenever the seller opted in,
 *   logged in or not.
 * - Logged out: the message path goes to /login WITH a return URL
 *   back to this listing (the audit flagged bare /login with no
 *   return); the WhatsApp path still works without logging in.
 *
 * Renders nothing for the owner or for a non-active listing — the
 * caller's owner block (Editar Anuncio) stays where it is.
 *
 * Monochrome only: orange-600 is Publish only.
 */
export function ContactSellerButton({
  listingId,
  sellerId,
  sellerWhatsapp,
  listingTitle,
  isOwner,
  isActive,
  label = 'Contactar Vendedor',
  size = 'default',
  variant = 'default',
  className = '',
}: ContactSellerButtonProps) {
  const { user } = useAuth()

  if (isOwner || !isActive) return null

  const whatsappHref = sellerWhatsapp
    ? `https://wa.me/${String(sellerWhatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola, vi tu anuncio "${listingTitle}" en ventasTecate.com y me interesa.`
      )}`
    : null

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {user ? (
        <Button asChild size={size} variant={variant} className="w-full">
          <Link href={`/messages?listing=${listingId}&seller=${sellerId}`}>{label}</Link>
        </Button>
      ) : (
        <Button asChild size={size} variant={variant} className="w-full">
          <Link href={`/login?redirect=${encodeURIComponent(`/listings/${listingId}`)}`}>
            Iniciar sesión para contactar
          </Link>
        </Button>
      )}
      {whatsappHref && (
        <Button asChild size={size} variant="outline" className="w-full">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            WhatsApp al vendedor
          </a>
        </Button>
      )}
    </div>
  )
}
