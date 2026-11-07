import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * Shared hub row styles — one source so the server-rendered Link rows
 * in /cuenta and the client action rows (report / sign out) look
 * identical. Monochrome rows, like OfferUp's Account list: icon,
 * label, optional detail on the right, chevron.
 */
export const HUB_ROW_CLASS =
  'flex w-full items-center gap-3 px-4 py-3 min-h-14 bg-white text-left transition-colors hover:bg-gray-50'
export const HUB_ROW_ICON_CLASS = 'h-5 w-5 text-gray-400 shrink-0'

export function HubRow({
  href,
  icon,
  label,
  detail,
}: {
  href: string
  icon: React.ReactNode
  label: string
  detail?: string
}) {
  return (
    <Link href={href} className={HUB_ROW_CLASS}>
      {icon}
      <span className="flex-1 text-[15px] text-gray-900">{label}</span>
      {detail && <span className="text-sm text-gray-500">{detail}</span>}
      <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
    </Link>
  )
}
