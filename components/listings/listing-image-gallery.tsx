'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ImageLightbox } from './image-lightbox'
import { ListingType } from '@/lib/types/database'

interface ListingImageGalleryProps {
  images: { id: string; image_url: string; order_index: number }[]
  listingTitle: string
  isSold: boolean
  listingType?: ListingType
}

const HERO_GRADIENTS: Record<string, string> = {
  service: 'from-blue-600 to-blue-800',
  event: 'from-amber-500 to-orange-600',
  product: 'from-gray-500 to-gray-700',
}

export function ListingImageGallery({ images, listingTitle, isSold, listingType = 'product' }: ListingImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const isEvent = listingType === 'event'

  if (images.length === 0) {
    return <div className="mb-6" />
  }

  // Event/poster layout: show flyer in full, centered like a poster on a wall
  if (isEvent) {
    return (
      <>
        <div className="relative mb-6">
          <div className="max-w-2xl mx-auto">
            {/* Primary flyer — full display, no crop */}
            <div className="relative rounded-lg overflow-hidden bg-gray-50 border cursor-pointer" onClick={() => openLightbox(0)}>
              <Image
                src={images[0].image_url}
                alt={listingTitle}
                width={800}
                height={1100}
                className="w-full h-auto hover:opacity-95 transition-opacity"
                priority
              />
              {isSold && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Badge variant="secondary" className="text-sm">Vendido</Badge>
                </div>
              )}
            </div>
            {/* Additional images as thumbnails below */}
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
          </div>
        </div>

        {lightboxOpen && (
          <ImageLightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
        )}
      </>
    )
  }

  return (
    <>
      <div className="relative mb-6">
        {/* 1 image: Single large image */}
        {images.length === 1 && (
          <div className="h-[400px] rounded-lg overflow-hidden relative bg-gray-100 cursor-pointer" onClick={() => openLightbox(0)}>
            <Image
              src={images[0].image_url}
              alt={listingTitle}
              fill
              className="object-cover hover:opacity-95 transition-opacity"
              priority
            />
            {isSold && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Badge variant="secondary" className="text-sm">
                  Vendido
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* 2 images: Split evenly */}
        {images.length === 2 && (
          <div className="grid grid-cols-2 gap-2 h-[400px] rounded-lg overflow-hidden">
            {images.map((image, idx) => (
              <div key={image.id} className="relative bg-gray-100 cursor-pointer" onClick={() => openLightbox(idx)}>
                <Image
                  src={image.image_url}
                  alt={listingTitle}
                  fill
                  className="object-cover hover:opacity-95 transition-opacity"
                  priority={idx === 0}
                />
                {idx === 0 && isSold && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="secondary" className="text-sm">
                      Vendido
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 3 images: Main image left, 2 stacked right */}
        {images.length === 3 && (
          <div className="grid grid-cols-2 gap-2 h-[400px] rounded-lg overflow-hidden">
            <div className="relative bg-gray-100 cursor-pointer" onClick={() => openLightbox(0)}>
              <Image
                src={images[0].image_url}
                alt={listingTitle}
                fill
                className="object-cover hover:opacity-95 transition-opacity"
                priority
              />
              {isSold && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Badge variant="secondary" className="text-sm">
                    Vendido
                  </Badge>
                </div>
              )}
            </div>
            <div className="grid grid-rows-2 gap-2">
              {images.slice(1, 3).map((image, idx) => (
                <div key={image.id} className="relative bg-gray-100 cursor-pointer" onClick={() => openLightbox(idx + 1)}>
                  <Image
                    src={image.image_url}
                    alt={listingTitle}
                    fill
                    className="object-cover hover:opacity-95 transition-opacity"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4 images: 2x2 grid */}
        {images.length === 4 && (
          <div className="grid grid-cols-2 gap-2 h-[400px] rounded-lg overflow-hidden">
            {images.map((image, idx) => (
              <div key={image.id} className="relative bg-gray-100 cursor-pointer" onClick={() => openLightbox(idx)}>
                <Image
                  src={image.image_url}
                  alt={listingTitle}
                  fill
                  className="object-cover hover:opacity-95 transition-opacity"
                  priority={idx === 0}
                />
                {idx === 0 && isSold && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="secondary" className="text-sm">
                      Vendido
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 5+ images: Airbnb-style with main image and thumbnail grid */}
        {images.length >= 5 && (
          <div className="grid grid-cols-4 gap-2 h-[400px] rounded-lg overflow-hidden">
            {/* Main Image - Takes 2 columns and full height */}
            <div className="col-span-2 row-span-2 relative bg-gray-100 cursor-pointer" onClick={() => openLightbox(0)}>
              <Image
                src={images[0].image_url}
                alt={listingTitle}
                fill
                className="object-cover hover:opacity-95 transition-opacity"
                priority
              />
              {isSold && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Badge variant="secondary" className="text-sm">
                    Vendido
                  </Badge>
                </div>
              )}
            </div>
            {/* Thumbnail grid - 2 columns, 2 rows */}
            {images.slice(1, 5).map((image, idx) => (
              <div key={image.id} className="relative bg-gray-100 cursor-pointer" onClick={() => openLightbox(idx + 1)}>
                <Image
                  src={image.image_url}
                  alt={listingTitle}
                  fill
                  className="object-cover hover:opacity-95 transition-opacity"
                />
              </div>
            ))}
            {/* Show more button if there are more than 5 images */}
            {images.length > 5 && (
              <div className="absolute bottom-4 right-4">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="bg-white/90 hover:bg-white"
                  onClick={() => openLightbox(0)}
                >
                  Ver todas las fotos ({images.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}
