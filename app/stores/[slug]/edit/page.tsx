'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, StoreType } from '@/lib/types/database'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Store as StoreIcon, Home, Car } from 'lucide-react'

export default function EditStorePage() {
  const { user, refreshStores, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [store, setStore] = useState<Store | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [storeLocation, setStoreLocation] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }

    const fetchStore = async () => {
      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('owner_id', user.id)
        .single()

      if (!data) {
        router.push('/') // not found or not owner
        return
      }

      setStore(data)
      setName(data.name)
      setDescription(data.description || '')
      setStoreLocation(data.location || '')
      if (data.avatar_url) {
        setAvatarPreview(data.avatar_url)
      }
      setPageLoading(false)
    }

    fetchStore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, slug])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen no debe superar 2MB')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !store) return

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      let avatarUrl = store.avatar_url || null

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}/${store.slug}/avatar.${fileExt}`

        // Remove old avatar if exists
        if (store.avatar_url) {
          const oldPath = store.avatar_url.split('/store-avatars/')[1]
          if (oldPath) {
            await supabase.storage.from('store-avatars').remove([oldPath])
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('store-avatars')
          .upload(fileName, avatarFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('store-avatars')
          .getPublicUrl(fileName)

        avatarUrl = publicUrl
      }

      const { error: updateError } = await supabase
        .from('stores')
        .update({
          name,
          description: description || null,
          location: storeLocation || null,
          avatar_url: avatarUrl,
        })
        .eq('id', store.id)

      if (updateError) throw updateError

      setSuccess(true)
      await refreshStores()
      setLoading(false)

      setTimeout(() => {
        router.push(`/stores/${store.slug}`)
      }, 1500)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Error al actualizar la tienda')
      setLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-6">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Editar Tienda</CardTitle>
            <CardDescription>Actualiza la información de {store?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar */}
              <div className="space-y-2">
                <Label>Logo de la Tienda</Label>
                <div className="flex items-center gap-4">
                  <div
                    className="relative h-20 w-20 rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center cursor-pointer hover:opacity-80 transition"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
                        alt="Logo"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <StoreIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Cambiar logo
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG. Máximo 2MB.</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Tienda</Label>
                <div>
                  <Badge variant="outline" className="flex items-center gap-1 w-fit text-xs">
                    {store?.store_type === 'real_estate' ? (
                      <><Home className="h-3 w-3" /> Inmuebles</>
                    ) : store?.store_type === 'automotive' ? (
                      <><Car className="h-3 w-3" /> Automotriz</>
                    ) : (
                      <><StoreIcon className="h-3 w-3" /> General</>
                    )}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">El tipo de tienda no se puede cambiar</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL de la Tienda</Label>
                <Input
                  id="slug"
                  value={store?.slug}
                  disabled
                  className="bg-gray-100 font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  El slug no se puede cambiar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la Tienda *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ej: Tienda Lupita"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe tu tienda..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">
                  {description.length}/500 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Ubicación</Label>
                <Input
                  id="location"
                  value={storeLocation}
                  onChange={(e) => setStoreLocation(e.target.value)}
                  placeholder="Ej: Centro de Tecate"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm text-gray-900 bg-gray-100 p-3 rounded">
                  ¡Tienda actualizada exitosamente! Redirigiendo...
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
