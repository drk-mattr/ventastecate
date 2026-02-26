'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'

const CATEGORIES = [
  'Electrónica',
  'Muebles',
  'Vehículos',
  'Ropa',
  'Deportes',
  'Hogar',
  'Juguetes',
  'Libros',
  'Mascotas',
  'Otros',
]

interface ExistingImage {
  id: string
  image_url: string
  order_index: number
}

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('active')
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    async function fetchListing() {
      if (!user) return

      const { data: listing, error: fetchError } = await supabase
        .from('listings')
        .select(`
          *,
          images:listing_images(
            id,
            image_url,
            order_index
          )
        `)
        .eq('id', id)
        .single()

      if (fetchError || !listing) {
        setError('No se pudo cargar el anuncio')
        setFetching(false)
        return
      }

      // Verify ownership
      if (listing.user_id !== user.id) {
        router.push(`/listings/${id}`)
        return
      }

      setTitle(listing.title)
      setDescription(listing.description)
      setPrice(String(listing.price))
      setCategory(listing.category)
      setLocation(listing.location)
      setStatus(listing.status)
      setExistingImages(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (listing.images || []).sort((a: any, b: any) => a.order_index - b.order_index)
      )
      setFetching(false)
    }

    fetchListing()
  }, [id, user, supabase, router])

  const totalImages = existingImages.filter(img => !removedImageIds.includes(img.id)).length + newImages.length

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + totalImages > 5) {
      setError('Máximo 5 imágenes permitidas')
      return
    }

    setNewImages([...newImages, ...files])
    const previews = files.map(file => URL.createObjectURL(file))
    setNewImagePreviews([...newImagePreviews, ...previews])
  }

  const removeExistingImage = (imageId: string) => {
    setRemovedImageIds([...removedImageIds, imageId])
  }

  const removeNewImage = (index: number) => {
    setNewImages(newImages.filter((_, i) => i !== index))
    setNewImagePreviews(newImagePreviews.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')

    try {
      // Update listing fields
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          title,
          description,
          price: parseFloat(price),
          category,
          location,
          status,
        })
        .eq('id', id)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Remove deleted images
      if (removedImageIds.length > 0) {
        // Get URLs for storage deletion
        const toRemove = existingImages.filter(img => removedImageIds.includes(img.id))
        
        // Delete from storage
        for (const img of toRemove) {
          const path = img.image_url.split('/listing-images/')[1]
          if (path) {
            await supabase.storage.from('listing-images').remove([path])
          }
        }

        // Delete from database
        await supabase
          .from('listing_images')
          .delete()
          .in('id', removedImageIds)
      }

      // Upload new images
      if (newImages.length > 0) {
        const keptImages = existingImages.filter(img => !removedImageIds.includes(img.id))
        let orderStart = keptImages.length

        const imageUploads = newImages.map(async (file, index) => {
          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}/${id}/${Date.now()}-${index}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('listing-images')
            .upload(fileName, file)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('listing-images')
            .getPublicUrl(fileName)

          await supabase
            .from('listing_images')
            .insert({
              listing_id: id,
              image_url: publicUrl,
              order_index: orderStart + index,
            })
        })

        await Promise.all(imageUploads)
      }

      router.push(`/listings/${id}`)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Error al actualizar el anuncio')
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <p className="text-center text-gray-500">Cargando anuncio...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Editar Anuncio</CardTitle>
            <CardDescription>Modifica la información de tu producto</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Ej: iPhone 13 Pro Max"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Describe tu producto..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (MXN) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    placeholder="1000.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Ubicación *</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  placeholder="Ej: Centro de Tecate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="sold">Vendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Existing Images */}
              <div className="space-y-2">
                <Label>Imágenes actuales</Label>
                {existingImages.filter(img => !removedImageIds.includes(img.id)).length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {existingImages
                      .filter(img => !removedImageIds.includes(img.id))
                      .map((img) => (
                        <div key={img.id} className="relative aspect-square">
                          <Image
                            src={img.image_url}
                            alt="Imagen del anuncio"
                            fill
                            className="object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(img.id)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sin imágenes</p>
                )}
              </div>

              {/* New Images */}
              <div className="space-y-2">
                <Label htmlFor="images">Agregar imágenes (Máximo {5 - totalImages + newImages.length > 5 ? 0 : 5 - totalImages} más)</Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={totalImages >= 5}
                />
                {newImagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {newImagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square">
                        <Image
                          src={preview}
                          alt={`Nueva imagen ${index + 1}`}
                          fill
                          className="object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
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
