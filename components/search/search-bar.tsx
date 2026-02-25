'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
    } else {
      router.push('/search')
    }
  }

  return (
    <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
      <Input
        type="search"
        placeholder="Buscar..."
        className="flex-1 h-9 text-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Button type="submit" size="sm" className="h-9 px-4">Buscar</Button>
    </form>
  )
}
