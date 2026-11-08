// Yellow filled stars — the one yellow exception to the site's
// monochrome rule (user decision 2026-11-07): rating stars are
// regular yellow; everything else stays black/white/gray.
// Rounds the value to the nearest whole star.
import { Star } from 'lucide-react'

export function ReviewStars({ value, className = 'h-4 w-4' }: { value: number; className?: string }) {
  const filled = Math.max(0, Math.min(5, Math.round(value)))
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) =>
        n <= filled ? (
          <Star key={n} className={`${className} text-amber-400`} fill="currentColor" />
        ) : (
          <Star key={n} className={`${className} text-gray-300`} />
        ),
      )}
    </span>
  )
}
