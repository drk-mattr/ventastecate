import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Shared empty-state block used across listing/search/profile pages.
 * Renders a centered message with an optional primary CTA and optional extra
 * content (e.g. a secondary link) between them.
 */
export function EmptyState({
  message,
  actionLabel,
  actionHref,
  surface = false,
  children,
}: {
  message: string
  actionLabel?: string
  actionHref?: string
  surface?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={`text-center py-12 ${surface ? 'bg-gray-50 rounded-lg' : ''}`}>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {children}
      {actionLabel && actionHref && (
        <Button asChild size="sm" variant="outline" className="hidden md:inline-flex rounded-full px-5">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  )
}
