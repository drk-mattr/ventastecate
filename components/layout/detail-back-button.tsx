'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

/**
 * Floating back button for detail pages (mobile only, OfferUp-style).
 * The detail layout has no header, so this is the way back — it floats
 * top-left over the hero. Falls back to home when there is no history
 * (e.g. the user landed here from an external link).
 */
export function DetailBackButton() {
  const router = useRouter()

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Volver"
      className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md backdrop-blur transition-colors hover:bg-white md:hidden"
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  )
}
