import Image from 'next/image'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const SIZES = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-20 w-20 text-2xl',
} as const

/**
 * Shared user avatar: shows the profile image when present, otherwise the
 * person's initials on a neutral circle. Replaces the hand-rolled avatar markup
 * repeated across the header, profiles, listing detail, and comments.
 */
export function UserAvatar({
  src,
  name,
  size = 'md',
  className = '',
}: {
  src?: string | null
  name: string
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <div
      className={`relative ${SIZES[size]} rounded-full bg-gray-200 flex items-center justify-center font-semibold overflow-hidden shrink-0 ${className}`}
    >
      {src ? (
        <Image src={src} alt={name} fill className="object-cover" />
      ) : (
        <span>{getInitials(name || 'U')}</span>
      )}
    </div>
  )
}
