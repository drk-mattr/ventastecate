'use client'

// The visible "Opinar" entry point on a business page: a button in the
// identity block that opens the review form as a pop-up over the
// profile, plus the deep link — /businesses/[id]?review=1 opens the
// page with the pop-up already open, so a shared link or a QR scan
// lands straight in the composer.
//
// Signed-out visitors go to sign-in first, with the deep link as the
// redirect, so they land back here with the pop-up open. The claimed
// owner never sees the button (owners cannot review their own
// business) and the dialog never renders the form for them.
//
// After a save the page reloads: the inline Opiniones section holds
// its own list state, so a reload is what makes the new review show
// there and in the aggregate. The ?review=1 param is stripped before
// the reload so the pop-up does not reopen.

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ReviewForm } from '@/components/businesses/review-form'
import type { BusinessReview } from '@/lib/types/database'
import { Star } from 'lucide-react'

export function BusinessReviewOpener({
  businessId,
  businessName,
  currentUserId,
  isOwner,
  myReview,
  defaultOpen = false,
}: {
  businessId: string
  businessName: string
  currentUserId?: string | null
  isOwner: boolean
  myReview?: BusinessReview | null
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (isOwner) return null

  // Signed out: the button is a sign-in link that brings the visitor
  // back here with the pop-up open.
  if (!currentUserId) {
    return (
      <Link
        href={`/login?redirect=/businesses/${businessId}?review=1`}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-gray-300 text-xs font-medium text-gray-700 hover:border-gray-500"
      >
        <Star className="h-3.5 w-3.5" /> Opinar
      </Link>
    )
  }

  const handleSaved = () => {
    // Strip the deep-link param so the reload does not reopen the pop-up.
    window.history.replaceState(null, '', `/businesses/${businessId}`)
    // The inline section keeps its own list state; reload to show the
    // new review there and in the aggregate. Give the "Guardada" state
    // a beat to read first.
    setTimeout(() => window.location.reload(), 900)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 px-3 rounded-full text-xs font-medium"
      >
        <Star className="h-3.5 w-3.5" /> Opinar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-lg font-semibold">
            Opina sobre {businessName}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Tu opinión ayuda a otros a conocer este negocio.
          </DialogDescription>
          <ReviewForm businessId={businessId} myReview={myReview} onSaved={handleSaved} />
        </DialogContent>
      </Dialog>
    </>
  )
}
