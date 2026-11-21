'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

/**
 * Floating back button for detail pages (mobile only, OfferUp-style).
 * The detail layout has no header, so this is the way back.
 *
 * Default: fixed top-left over the page — used by news, events, and
 * item detail pages, where the hero is first and the button sits on
 * the image. On the default listing layout the title used to sit on
 * top (PR #212), so the fixed button clipped the title text.
 *
 * inHero (2026-11-20): absolute-positioned instead, so the parent
 * renders it INSIDE the photo hero as an overlay chip — it can only
 * ever sit on the image, never on text, and scrolls away with the
 * hero. Same chevron, same tap target, same back behavior.
 */
export function DetailBackButton({ inHero = false }: { inHero?: boolean }) {
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
      className={inHero
        ? "absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md backdrop-blur transition-colors hover:bg-white md:hidden"
        : "fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md backdrop-blur transition-colors hover:bg-white md:hidden"}
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  )
}
