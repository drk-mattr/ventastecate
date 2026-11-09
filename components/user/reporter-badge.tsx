import { Megaphone } from 'lucide-react'

/**
 * "Reportero local" — earned at the author's 3rd live news post
 * (migration 050 trigger), revoked below 3. A small gray mark,
 * deliberately distinct from the orange official BadgeCheck on
 * `Cuenta oficial`: the official mark keeps its meaning, and this
 * one never uses orange. Renders next to the name on the detail
 * page byline and the public profile; the feed card has no author
 * slot on news cards, so it does not render there in v1.
 */
export function ReporterBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span
        title="Reportero local"
        aria-label="Reportero local"
        className="inline-flex shrink-0 items-center text-gray-500"
      >
        <Megaphone className="h-3 w-3 text-gray-700" />
      </span>
    )
  }
  return (
    <span
      title="Reportero local"
      className="inline-flex items-center gap-0.5 text-[11px] font-medium text-gray-500"
    >
      <Megaphone className="h-3.5 w-3.5 text-gray-700" />
      Reportero local
    </span>
  )
}
