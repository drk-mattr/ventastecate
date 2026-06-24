import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

/**
 * Shared empty-state block used across listing/search/profile pages.
 * Renders an optional illustration, an optional message, an optional primary
 * CTA, and any extra content (e.g. a secondary link) in between.
 */
export function EmptyState({
  message,
  actionLabel,
  actionHref,
  surface = false,
  imageSrc,
  imageAlt = '',
  children,
}: {
  message?: string
  actionLabel?: string
  actionHref?: string
  surface?: boolean
  imageSrc?: string
  imageAlt?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={`text-center ${
        imageSrc
          ? 'border-[6px] border-dashed border-gray-200/70 bg-gray-100/60 rounded-2xl max-w-sm mx-auto px-6 py-10'
          : `py-12 ${surface ? 'bg-gray-50 rounded-lg' : ''}`
      }`}
    >
      {imageSrc && (
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={1254}
          height={1254}
          className="mx-auto w-40 sm:w-48 h-auto select-none pointer-events-none mix-blend-multiply opacity-20"
        />
      )}
      {message && <p className={`text-sm ${imageSrc ? 'text-gray-300 mt-2' : 'text-gray-500 mb-4'}`}>{message}</p>}
      {children}
      {actionLabel && actionHref && (
        <Button asChild size="sm" variant="outline" className="hidden md:inline-flex rounded-full px-5">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  )
}
