'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LOCATION_OPTIONS, LOCATION_COOKIE } from '@/lib/business-regions'

// Site-wide location selector: the viewer picks one location in the
// header and every browsable feed follows it. Persisted in a cookie so
// server components can read it; a ?region= param on /businesses still
// overrides it for that shared link only.
export function LocationSelector() {
  const router = useRouter()
  const [selected, setSelected] = useState('Tecate')

  useEffect(() => {
    const match = document.cookie.split('; ').find((c) => c.startsWith(`${LOCATION_COOKIE}=`))
    const value = match ? decodeURIComponent(match.split('=')[1]) : null
    if (value && LOCATION_OPTIONS.some((o) => o.label === value)) setSelected(value)
  }, [])

  const select = (label: string) => {
    setSelected(label)
    // Cookie assignment, not component state: the immutability lint
    // rule flags document.cookie writes, so it is disabled here.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `${LOCATION_COOKIE}=${encodeURIComponent(label)}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs text-gray-700 hover:text-gray-900" aria-label="Ubicación" title="Ubicación">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline max-w-[110px] truncate">{selected}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {LOCATION_OPTIONS.map((o) => (
          <DropdownMenuItem key={o.label} onClick={() => select(o.label)} className="text-xs flex items-center justify-between">
            <span>{o.label}</span>
            {selected === o.label && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
