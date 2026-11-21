'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { ImageLightbox } from './image-lightbox'
import { ListingType } from '@/lib/types/database'

interface ListingImageGalleryProps {
  // caption is optional: business photos have none (captions are a
  // listing-form feature only, migration 056), and rows written
  // before the migration carry null.
  images: { id: string; image_url: string; order_index: number; caption?: string | null }[]
  listingTitle: string
  isSold: boolean
  listingType?: ListingType
  variant?: 'default' | 'side'
  /** Mobile full-bleed hero: the gallery breaks out of the page
      container (edge-to-edge) on small screens only. */
  fullBleed?: boolean
  /** Optional strip rendered across the top of the hero (e.g. the
      SE BUSCA banner on lost posts). */
  banner?: React.ReactNode
}

export function ListingImageGallery({ images, listingTitle, isSold, listingType = 'product', variant = 'default', fullBleed = false, banner }: ListingImageGalleryProps) {
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
        <div className="relative max-h-[75svh] sm:max-h-none rounded-none sm:rounded-xl overflow-hidden bg-gray-50 border-0 sm:border cursor-pointer" onClick={() => openLightbox(0)}>
          <Image
            src={images[0].image_url}
            alt={listingTitle}
            width={800}
            height={1100}
            className="w-full h-auto hover:opacity-95 transition-opacity"
            priority
          />
          {soldOverlay}
          {banner}
        </div>
        {/* Caption under the poster, El Imparcial-style — small gray
            text, only when the seller wrote one. */}
        {images[0].caption && (
          <p className="mt-2 text-sm text-gray-500">{images[0].caption}</p>
        )}
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
          <div className={`relative mb-6 ${fullBleed ? '-mx-4 sm:mx-0' : ''}`}>
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

  // ── News hero: the photo at its own aspect ratio — no fixed-height
  // box, no blurred backdrop, no letterbox gray. The container is
  // white, so even a capped very-tall photo shows no gray zones
  // against the white article page. Never cropped: object-contain,
  // never object-cover. News only — products/events keep the hero
  // below.
  if (listingType === 'news') {
    return (
      <>
        <div className="mb-6">
          <div
            className="relative max-h-[75svh] sm:max-h-[560px] rounded-none sm:rounded-xl overflow-hidden bg-white cursor-pointer"
            onClick={() => openLightbox(heroIdx)}
          >
            <Image
              src={hero.image_url}
              alt={listingTitle}
              width={1200}
              height={900}
              className="w-full h-auto max-h-[75svh] sm:max-h-[560px] object-contain hover:opacity-[0.98] transition-opacity"
              sizes="(max-width: 1024px) 100vw, 55vw"
              priority
            />
            {banner}
            {soldOverlay}
            {images.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full">
                {heroIdx + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Caption under the current photo, El Imparcial-style —
              small gray text, only when the seller wrote one. */}
          {hero.caption && (
            <p className="mt-2 text-sm text-gray-500">{hero.caption}</p>
          )}

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

  // ── Default branch: Airbnb-style photo grid on sm+ screens,
  // hero + thumbnail strip on mobile (unchanged). The old desktop
  // hero letterboxed the image (object-contain + blurred backdrop);
  // every grid cell is object-cover, so no blurred bars and no
  // letterbox. Tapping any cell opens the lightbox at that index
  // (the black fullscreen viewer stays). News and event/poster
  // branches above are untouched.
  const visibleCount = Math.min(images.length, 5)
  const overflowCount = images.length - visibleCount

  // Grid geometry (sm+ only): the first photo is large on the
  // left, the rest fill a 2×2 on the right. Fewer photos
  // collapse: 1 photo is a single wide cell, 2 photos are equal
  // halves, 3 photos are big left + two stacked right, 4 photos
  // are big left + one wide + two small on the right.
  const gridCols =
    images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-4 grid-rows-2'
  const gridAspect = images.length === 1 ? 'aspect-[16/9]' : 'aspect-[2/1]'
  const cellClass = (idx: number): string => {
    if (images.length <= 2) return ''
    if (idx === 0) return 'col-span-2 row-span-2'
    if (images.length === 3 || (images.length === 4 && idx === 1)) return 'col-span-2'
    return ''
  }

  return (
    <>
      <div className={fullBleed ? '-mx-4 sm:mx-0 mb-6' : 'mb-6'}>
        {/* Mobile: hero + thumbnail strip, exactly as before —
            the hero already crops to fill (object-cover) here. */}
        <div className="sm:hidden">
          <div
            className="relative h-[68svh] rounded-none overflow-hidden bg-gray-100 cursor-pointer"
            onClick={() => openLightbox(heroIdx)}
          >
            <Image
              src={hero.image_url}
              alt={listingTitle}
              fill
              className="object-cover transition-opacity hover:opacity-[0.98]"
              sizes="(max-width: 1024px) 100vw, 55vw"
              priority
            />
            {banner}
            {soldOverlay}
            {images.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full">
                {heroIdx + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Caption under the current photo, El Imparcial-style —
              small gray text, only when the seller wrote one. */}
          {hero.caption && (
            <p className="mt-2 text-sm text-gray-500">{hero.caption}</p>
          )}

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

        {/* Desktop: Airbnb-style photo grid — every cell fills its
            frame (object-cover), no blurred backdrop, no letterbox. */}
        <div className="hidden sm:block">
          <div className={`relative grid ${gridCols} ${gridAspect} gap-2 rounded-xl overflow-hidden bg-gray-100`}>
            {images.slice(0, visibleCount).map((image, idx) => (
              <div
                key={image.id}
                className={`relative overflow-hidden cursor-pointer ${cellClass(idx)}`}
                onClick={() => openLightbox(idx)}
              >
                <Image
                  src={image.image_url}
                  alt={idx === 0 ? listingTitle : ''}
                  fill
                  className="object-cover hover:opacity-95 transition-opacity"
                  sizes={idx === 0 ? '(max-width: 1024px) 100vw, 50vw' : '(max-width: 1024px) 50vw, 25vw'}
                  priority={idx === 0}
                />
                {idx === visibleCount - 1 && overflowCount > 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-base font-semibold">+{overflowCount} fotos</span>
                  </div>
                )}
                {idx === visibleCount - 1 && overflowCount === 0 && images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full">
                    {heroIdx + 1} / {images.length}
                  </div>
                )}
              </div>
            ))}
            {banner}
            {soldOverlay}
          </div>

          {/* Caption under the current photo, El Imparcial-style. */}
          {hero.caption && (
            <p className="mt-2 text-sm text-gray-500">{hero.caption}</p>
          )}
        </div>
      </div>

      {lightboxOpen && (
        <ImageLightbox images={images} initialIndex={selected} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  )
}
