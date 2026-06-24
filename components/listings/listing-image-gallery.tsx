'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { ImageLightbox } from './image-lightbox'
import { ListingType } from '@/lib/types/database'

interface ListingImageGalleryProps {
  images: { id: string; image_url: string; order_index: number }[]
  listingTitle: string
  isSold: boolean
  listingType?: ListingType
  variant?: 'default' | 'side'
  /** Floating actions (like/save/share) rendered over the hero's top-right. */
  actions?: React.ReactNode
}

export function ListingImageGallery({ images, listingTitle, isSold, listingType = 'product', variant = 'default', actions }: ListingImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [selected, setSelected] = useState(0)

  const openLightbox = (index: number) => {
    setSelected(index)
    setLightboxOpen(true)
  }

  const isEvent = listingType === 'event'

  if (images.length === 0) {
    return <div className="mb-6" />
  }

  const soldOverlay = isSold ? (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
      <Badge variant="secondary" className="text-sm">Vendido</Badge>
    </div>
  ) : null

  // ── Event / poster layout: show the flyer in full, thumbs below ──
  if (isEvent) {
    const posterContent = (
      <>
        <div className="relative rounded-xl overflow-hidden bg-gray-50 border cursor-pointer" onClick={() => openLightbox(0)}>
          <Image
            src={images[0].image_url}
            alt={listingTitle}
            width={800}
            height={1100}
            className="w-full h-auto hover:opacity-95 transition-opacity"
            priority
          />
          {soldOverlay}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 mt-2 overflow-x-auto">
            {images.slice(1).map((image, idx) => (
              <div
                key={image.id}
                className="relative w-20 h-20 shrink-0 rounded-md overflow-hidden bg-gray-100 cursor-pointer border"
                onClick={() => openLightbox(idx + 1)}
              >
                <Image src={image.image_url} alt={listingTitle} fill className="object-cover hover:opacity-90 transition-opacity" />
              </div>
            ))}
          </div>
        )}
      </>
    )

    return (
      <>
        {variant === 'side' ? (
          <div>{posterContent}</div>
        ) : (
          <div className="relative mb-6">
            <div className="max-w-2xl mx-auto">{posterContent}</div>
          </div>
        )}
        {lightboxOpen && (
          <ImageLightbox images={images} initialIndex={selected} onClose={() => setLightboxOpen(false)} />
        )}
      </>
    )
  }

  // ── Hero image + thumbnail strip (FB Marketplace / OfferUp style) ──
  const heroIdx = images[selected] ? selected : 0
  const hero = images[heroIdx]

  return (
    <>
      <div className="mb-6">
        {/* Hero — full image at natural ratio, letterboxed on a soft blurred fill */}
        <div
          className="relative aspect-square sm:aspect-auto sm:h-[460px] rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
          onClick={() => openLightbox(heroIdx)}
        >
          {/* Blurred backdrop fills the letterbox area */}
          <Image
            src={hero.image_url}
            alt=""
            aria-hidden
            fill
            className="object-cover scale-110 blur-2xl opacity-30"
            sizes="(max-width: 1024px) 100vw, 55vw"
          />
          {/* The actual image — never cropped or stretched */}
          <Image
            src={hero.image_url}
            alt={listingTitle}
            fill
            className="object-contain transition-opacity hover:opacity-[0.98]"
            sizes="(max-width: 1024px) 100vw, 55vw"
            priority
          />
          {soldOverlay}
          {actions && (
            <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
          {images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full">
              {heroIdx + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1 -mx-1 px-1">
            {images.map((image, idx) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setSelected(idx)}
                aria-label={`Ver imagen ${idx + 1}`}
                className={`relative h-16 w-16 sm:h-[72px] sm:w-[72px] shrink-0 rounded-lg overflow-hidden transition-all ${
                  idx === heroIdx ? 'ring-2 ring-gray-900' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Image src={image.image_url} alt="" fill className="object-cover" sizes="72px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <ImageLightbox images={images} initialIndex={selected} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  )
}
