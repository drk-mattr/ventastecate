'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Lightweight right-side drawer for the mobile menu. Slides in smoothly with a
 * fading backdrop; closes on backdrop click, the X, or Escape. Mobile-only.
 */
export function MobileMenuDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <div className="md:hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className={`fixed top-0 right-0 z-[70] h-full w-72 max-w-[82vw] bg-white shadow-xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b">
          <span className="font-forum font-bold lowercase text-lg">ventastecate.com</span>
          <button
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-1 -mr-1 text-gray-500 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-2">{children}</nav>
      </aside>
    </div>
  )
}
