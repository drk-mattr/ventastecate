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
    <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
      <Input
        type="search"
        placeholder="Buscar productos..."
        className="flex-1"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Button type="submit">Buscar</Button>
    </form>
  )
}
