'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'

type ContactBusinessButtonProps = {
  businessId: string
  businessName: string
  /** businesses.claimed_by — null while the business is unclaimed. */
  claimedBy: string | null
  /** The viewer is the claimed owner — they cannot message themselves. */
  isOwner: boolean
}

/**
 * Business messaging (Option A, modified 2026-11-07) — the business
 * variant of ContactSellerButton. One button on every business page:
 * claimed → opens a thread with the owner in /messages (the same
 * ?business&seller pending flow as ?listing&seller); unclaimed →
 * grayed out and disabled, nothing opens, nothing is sent. The
 * quiet line under the actions row (in BusinessEngagementBar)
 * explains why; the page's 'Reclamar este negocio' link is the
 * nudge to claim. No moderator inbox, no transfer on claim.
 *
 * Monochrome only: orange-600 is Publish only.
 */
export function ContactBusinessButton({
  businessId,
  businessName,
  claimedBy,
  isOwner,
}: ContactBusinessButtonProps) {
  const { user } = useAuth()

  if (isOwner) return null

  if (!claimedBy) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Este negocio aún no ha reclamado su página"
        className="flex h-7 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-xs font-medium text-gray-400 cursor-not-allowed"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Mensaje
      </button>
    )
  }

  const href = user
    ? `/messages?business=${businessId}&seller=${claimedBy}`
    : `/login?redirect=${encodeURIComponent(`/businesses/${businessId}`)}`

  return (
    <Link
      href={href}
      aria-label={`Enviar mensaje a ${businessName}`}
      className="flex h-7 items-center gap-1.5 rounded-full bg-gray-900 px-3 text-xs font-medium text-white hover:bg-gray-800"
    >
      <MessageCircle className="h-3.5 w-3.5" />
      Mensaje
    </Link>
  )
}
