'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ImageLightbox } from './image-lightbox'

interface ListingImageGalleryProps {
  images: { id: string; image_url: string; order_index: number }[]
  listingTitle: string
  isSold: boolean
}

export function ListingImageGallery({ images, listingTitle, isSold }: ListingImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  if (images.length === 0) {
    return (
      <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center mb-6">
        <p className="text-sm text-gray-400">Sin imágenes</p>
      </div>
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
