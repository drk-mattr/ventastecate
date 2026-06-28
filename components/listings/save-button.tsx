'use client'

import { useState, useTransition } from 'react'
import { Bookmark } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useAuth } from '@/lib/auth/auth-context'
import { useRouter } from 'next/navigation'

interface SaveButtonProps {
  listingId: string
  initialSaved: boolean
  initialCount: number
  size?: 'sm' | 'md'
}

export function SaveButton({ listingId, initialSaved, initialCount, size = 'sm' }: SaveButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [count, setCount] = useState(initialCount)
  const [animating, setAnimating] = useState(false)
  const [isPending, startTransition] = useTransition()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      router.push('/login')
      return
    }

    const wasSaved = saved
    setSaved(!wasSaved)
    setCount(prev => wasSaved ? Math.max(prev - 1, 0) : prev + 1)

    if (!wasSaved) {
      setAnimating(true)
      setTimeout(() => setAnimating(false), 400)
    }

    startTransition(async () => {
      // Supabase returns errors in `error` rather than throwing — check it.
      const { error } = wasSaved
        ? await supabase
            .from('listing_saves')
            .delete()
            .eq('listing_id', listingId)
            .eq('user_id', user.id)
        : await supabase
            .from('listing_saves')
            .insert({ listing_id: listingId, user_id: user.id })

      if (error) {
        setSaved(wasSaved)
        setCount(prev => wasSaved ? prev + 1 : Math.max(prev - 1, 0))
      }
    })
  }

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-1 transition-all duration-150 ${
        saved
          ? 'text-blue-500'
          : 'text-gray-400 hover:text-blue-400'
      } ${textSize}`}
      aria-label={saved ? 'Quitar guardado' : 'Guardar'}
    >
      <Bookmark
        className={`${iconSize} transition-transform duration-300 ${
          animating ? 'scale-125' : 'scale-100'
        } ${saved ? 'fill-current' : ''}`}
      />
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  )
}
