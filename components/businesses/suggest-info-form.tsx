'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface Props {
  businessId: string
  current: { phone: string; address: string; hours: string; category: string; website: string }
  categories: string[]
}

// Fill in a business shell. Values go live instantly, attributed to the
// contributor; the route only records fields that actually changed.
export function SuggestInfoForm({ businessId, current, categories }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const [phone, setPhone] = useState(current.phone)
  const [address, setAddress] = useState(current.address)
  const [hours, setHours] = useState(current.hours)
  const [category, setCategory] = useState(current.category)
  const [website, setWebsite] = useState(current.website)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) {
    return (
      <p className="text-sm text-gray-500">
        <a href={`/login?redirect=/businesses/${businessId}/agregar-informacion`} className="text-gray-900 underline">Inicia sesión</a> para agregar información a este negocio.
      </p>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch(`/api/businesses/${businessId}/suggest-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, address, hours, category, website }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((data as { error?: string }).error || 'No se pudo guardar la información')
      setLoading(false)
      return
    }
    router.push(`/businesses/${businessId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="info-phone" className="text-sm">Teléfono</Label>
        <Input id="info-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 665 123 4567" inputMode="tel" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="info-address" className="text-sm">Dirección</Label>
        <Input id="info-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej: Av. Benito Juárez 290" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="info-hours" className="text-sm">Horario</Label>
        <Input id="info-hours" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Ej: Lun–Sáb 9:00–18:00" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="info-category" className="text-sm">Categoría</Label>
        <Input id="info-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: café" list="info-categories" />
        <datalist id="info-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="space-y-1">
        <Label htmlFor="info-website" className="text-sm">Web o red social</Label>
        <Input id="info-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Ej: instagram.com/minegocio" inputMode="url" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Guardar información'}</Button>
    </form>
  )
}
