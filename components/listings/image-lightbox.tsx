'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageLightboxProps {
  images: { id: string; image_url: string; order_index: number }[]
  initialIndex?: number
  onClose: () => void
}

/**
 * Full-screen photo viewer, shared by the business page gallery and the
 * listing detail gallery. Owns the screen while open: it sits above the
 * mobile bottom nav (z-[60], like the stories viewer), supports swipe /
 * keyboard advance, and locks body scroll so a drag cannot move the page
 * behind it.
 */
export function ImageLightbox({ images, initialIndex = 0, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length])

  // Keyboard: arrows advance, Escape closes.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious()
      else if (e.key === 'ArrowRight') goToNext()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goToNext, goToPrevious, onClose])

  // Lock body scroll while the viewer is open; restore on unmount.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // Keep the active thumbnail visible in the strip (7 x 64px + gaps is
  // ~528px of strip in a 390px viewport — without this the active thumb
  // can sit off-screen after swiping to a late photo).
  useEffect(() => {
    stripRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [currentIndex])

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start || images.length < 2) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    // ~50px horizontal swipe, and clearly horizontal (not a vertical drag).
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goToNext()
      else goToPrevious()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-10 h-11 w-11 text-white hover:bg-white/10"
        onClick={onClose}
        aria-label="Cerrar"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Image counter */}
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 z-10 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Main image */}
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] mx-auto px-4 sm:px-20">
        <Image
          src={images[currentIndex].image_url}
          alt={`Image ${currentIndex + 1}`}
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Navigation buttons — rendered AFTER the image container with
          z-10 so the photo cannot cover them (the old chevrons were
          dead on tap: the image container painted above them). */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 h-11 w-11 text-white hover:bg-white/10"
            onClick={goToPrevious}
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 h-11 w-11 text-white hover:bg-white/10"
            onClick={goToNext}
            aria-label="Foto siguiente"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {/* Thumbnail strip (optional, for quick navigation) */}
      {images.length > 1 && (
        <div
          ref={stripRef}
          className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4"
        >
          {images.map((image, idx) => (
            <button
              key={image.id}
              data-active={idx === currentIndex}
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-16 h-16 flex-shrink-0 rounded overflow-hidden border-2 transition-all ${
                idx === currentIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              aria-label={`Ver foto ${idx + 1}`}
            >
              <Image
                src={image.image_url}
                alt={`Thumbnail ${idx + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
