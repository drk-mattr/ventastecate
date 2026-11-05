'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

/**
 * Add a business to the index. No ownership required: any logged-in user can
 * add a business they know, with just a name. Later users can add listings
 * that mention it; merging near-duplicates and richer fields come later.
 */
export function AddBusinessForm() {
  const { user } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) {
    return (
      <p className="text-sm text-gray-500">
        <a href="/login" className="text-gray-900 underline">Inicia sesión</a> para agregar un negocio al índice.
      </p>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) { setError('Escribe al menos 2 caracteres'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const nameNormalized = trimmed.toLowerCase().replace(/\s+/g, ' ')
    const { data, error: insertError } = await supabase
      .from('businesses')
      .insert({ name: trimmed, name_normalized: nameNormalized, location: location.trim() || null, category: category.trim() || null, created_by: user.id })
      .select('id')
      .single()
    if (insertError) {
      // Exact-name duplicate: land on the existing business instead of failing.
      const { data: existing } = await supabase.from('businesses').select('id').eq('name_normalized', nameNormalized).single()
      if (existing) { router.push(`/businesses/${existing.id}`); return }
      setError('No se pudo agregar el negocio. Inténtalo de nuevo.')
      setLoading(false); return
    }
    router.push(`/businesses/${data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="biz-name" className="text-sm">Nombre del negocio</Label>
        <Input id="biz-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Tacos El Poblano" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="biz-location" className="text-sm">Ubicación (opcional)</Label>
          <Input id="biz-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Tecate" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="biz-category" className="text-sm">Categoría (opcional)</Label>
          <Input id="biz-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: Comida" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? 'Agregando…' : 'Agregar negocio'}</Button>
    </form>
  )
}
