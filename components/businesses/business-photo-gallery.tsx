'use client'

import { useRef, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { ImageLightbox } from '@/components/listings/image-lightbox'

// Airbnb-style photo gallery for a business page.
//
// Desktop: one big photo left, a 2x2 grid right — 5 visible, the rest
// behind a "Ver todas las fotos" pill on the last tile, exactly like an
// Airbnb listing. Mobile: a swipeable carousel with a "1 / 7" counter.
// Any photo opens the fullscreen lightbox (reused from listings).
//
// This replaces the old hero + 3-col square grid. The squares cropped
// every portrait drink photo the same way, so the page felt chaotic
// even though the cells were uniform.
export function BusinessPhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [slide, setSlide] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  if (photos.length === 0) return null

  const lightboxImages = photos.map((url, i) => ({ id: `photo-${i}`, image_url: url, order_index: i }))
  const extra = photos.length - 5

  const onScroll = () => {
    const el = trackRef.current
    if (!el || el.clientWidth === 0) return
    setSlide(Math.min(photos.length - 1, Math.round(el.scrollLeft / el.clientWidth)))
  }

  const img = (url: string, alt: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="h-full w-full object-cover" />
  )

  // One tile of the desktop mosaic. `corners` carries the outer rounded
  // corners for its position (inner corners stay square, Airbnb-style).
  // Clicking opens the lightbox at that photo.
  const tile = (index: number, corners: string, span = '') => (
    <button
      key={photos[index]}
      type="button"
      onClick={() => setLightboxIndex(index)}
      aria-label={`Ver foto ${index + 1} de ${photos.length}`}
      className={`relative block overflow-hidden ${span} ${corners}`}
    >
      {img(photos[index], index === 0 ? name : '')}
    </button>
  )

  // Right-hand side of the mosaic, by photo count. 2 photos: one tall
  // tile. 3: two stacked. 4: two on top, one spanning the bottom row.
  // 5+: a full 2x2 grid, with the "Ver todas" pill on the last tile.
  const rightSide = () => {
    if (photos.length === 2) {
      return tile(1, 'rounded-r-xl')
    }
    if (photos.length === 3) {
      return (
        <div className="grid grid-rows-2 gap-2">
          {tile(1, 'rounded-tr-xl')}
          {tile(2, 'rounded-br-xl')}
        </div>
      )
    }
    if (photos.length === 4) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-2">
          {tile(1, '')}
          {tile(2, 'rounded-tr-xl')}
          {tile(3, 'rounded-br-xl', 'col-span-2')}
        </div>
      )
    }
    return (
      <div className="relative grid grid-cols-2 grid-rows-2 gap-2">
        {tile(1, '')}
        {tile(2, 'rounded-tr-xl')}
        {tile(3, '')}
        {tile(4, 'rounded-br-xl')}
        {extra > 0 && (
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 shadow"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Ver todas las fotos
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Desktop mosaic */}
      <div className="mb-6 hidden sm:block">
        {photos.length === 1 ? (
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            aria-label="Ver foto 1 de 1"
            className="relative block h-[420px] w-full overflow-hidden rounded-xl"
          >
            {img(photos[0], name)}
          </button>
        ) : (
          <div className="grid h-[420px] grid-cols-2 gap-2">
            {tile(0, 'rounded-l-xl')}
            {rightSide()}
          </div>
        )}
      </div>

      {/* Mobile swipe carousel with counter */}
      <div className="relative mb-6 sm:hidden">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex overflow-x-auto snap-x snap-mandatory gap-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setLightboxIndex(i)}
              aria-label={`Ver foto ${i + 1} de ${photos.length}`}
              className="relative block w-full shrink-0 snap-center overflow-hidden rounded-xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={i === 0 ? name : ''} className="aspect-[4/3] w-full object-cover" />
            </button>
          ))}
        </div>
        {photos.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
            {slide + 1} / {photos.length}
          </span>
        )}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox images={lightboxImages} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  )
}
