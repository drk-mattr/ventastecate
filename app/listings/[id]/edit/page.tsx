'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { Header } from '@/components/layout/header'
import { LocationPicker } from '@/components/listings/location-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RealEstateMetadata, AutomotiveMetadata, ListingMetadata, ListingType } from '@/lib/types/database'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

const PRODUCT_CATEGORIES = [
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

const SERVICE_CATEGORIES = [
  'Plomería',
  'Electricidad',
  'Albañilería',
  'Pintura',
  'Belleza y Uñas',
  'Reparaciones',
  'Limpieza',
  'Jardinería',
  'Clases y Tutorías',
  'Fletes y Mudanzas',
  'Otros Servicios',
]

const EVENT_CATEGORIES = [
  'Eventos',
  'Anuncios Comunitarios',
  'Empleos',
]

const TYPE_LABELS: Record<ListingType, { icon: string; label: string }> = {
  product: { icon: '📦', label: 'Producto' },
  service: { icon: '🔧', label: 'Servicio' },
  event: { icon: '📢', label: 'Evento' },
}

function getCategoriesForType(type: ListingType) {
  if (type === 'service') return SERVICE_CATEGORIES
  if (type === 'event') return EVENT_CATEGORIES
  return PRODUCT_CATEGORIES
}

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
  const [city, setCity] = useState('')
  const [stateRegion, setStateRegion] = useState('')
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [status, setStatus] = useState('active')
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [listingType, setListingType] = useState<ListingType>('product')
  const [priceConsultar, setPriceConsultar] = useState(false)
  const [metadataType, setMetadataType] = useState<string | null>(null)

  // Real estate metadata
  const [propertyType, setPropertyType] = useState('casa')
  const [transactionType, setTransactionType] = useState('venta')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [constructionM2, setConstructionM2] = useState('')
  const [lotM2, setLotM2] = useState('')
  const [parkingSpots, setParkingSpots] = useState('')

  // Automotive metadata
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [mileageKm, setMileageKm] = useState('')
  const [transmission, setTransmission] = useState('automatica')
  const [fuelType, setFuelType] = useState('gasolina')
  const [color, setColor] = useState('')
  const [doors, setDoors] = useState('4')

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
      setPrice(listing.price > 0 ? String(listing.price) : '')
      setPriceConsultar(listing.price === 0)
      setCategory(listing.category)
      setLocation(listing.location)
      setCity(listing.city || '')
      setStateRegion(listing.state_region || '')
      setCountryCode(listing.country_code || null)
      setStatus(listing.status)
      setListingType(listing.listing_type || 'product')
      setExistingImages(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (listing.images || []).sort((a: any, b: any) => a.order_index - b.order_index)
      )

      // Load metadata
      const meta = listing.metadata as ListingMetadata | null
      if (meta?.type === 'real_estate') {
        setMetadataType('real_estate')
        setPropertyType(meta.property_type || 'casa')
        setTransactionType(meta.transaction_type || 'venta')
        setBedrooms(meta.bedrooms?.toString() || '')
        setBathrooms(meta.bathrooms?.toString() || '')
        setConstructionM2(meta.construction_m2?.toString() || '')
        setLotM2(meta.lot_m2?.toString() || '')
        setParkingSpots(meta.parking_spots?.toString() || '')
      } else if (meta?.type === 'automotive') {
        setMetadataType('automotive')
        setMake(meta.make || '')
        setModel(meta.model || '')
        setYear(meta.year?.toString() || '')
        setMileageKm(meta.mileage_km?.toString() || '')
        setTransmission(meta.transmission || 'automatica')
        setFuelType(meta.fuel_type || 'gasolina')
        setColor(meta.color || '')
        setDoors(meta.doors?.toString() || '4')
      }

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
      // Build metadata
      let metadata: ListingMetadata | null = null
      if (metadataType === 'real_estate') {
        metadata = {
          type: 'real_estate',
          property_type: propertyType,
          transaction_type: transactionType,
          ...(bedrooms && { bedrooms: parseInt(bedrooms) }),
          ...(bathrooms && { bathrooms: parseInt(bathrooms) }),
          ...(constructionM2 && { construction_m2: parseInt(constructionM2) }),
          ...(lotM2 && { lot_m2: parseInt(lotM2) }),
          ...(parkingSpots && { parking_spots: parseInt(parkingSpots) }),
        } as RealEstateMetadata
      } else if (metadataType === 'automotive') {
        metadata = {
          type: 'automotive',
          make,
          model,
          year: parseInt(year),
          ...(mileageKm && { mileage_km: parseInt(mileageKm) }),
          transmission,
          fuel_type: fuelType,
          ...(color && { color }),
          ...(doors && { doors: parseInt(doors) }),
        } as AutomotiveMetadata
      }

      // Update listing fields
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          title,
          description,
          price: priceConsultar ? 0 : parseFloat(price),
          category,
          location,
          city: city || null,
          state_region: stateRegion || null,
          country_code: countryCode,
          metadata,
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
        const orderStart = keptImages.length

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Editar Anuncio</CardTitle>
                <CardDescription>Modifica la información de tu publicación</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {TYPE_LABELS[listingType].icon} {TYPE_LABELS[listingType].label}
              </Badge>
            </div>
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
                  <Label htmlFor="price">Precio (MXN) {priceConsultar ? '' : '*'}</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required={!priceConsultar}
                    disabled={priceConsultar}
                    placeholder={priceConsultar ? 'A consultar' : '1000.00'}
                  />
                  {(listingType === 'service' || listingType === 'event') && (
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={priceConsultar}
                        onChange={(e) => { setPriceConsultar(e.target.checked); if (e.target.checked) setPrice('') }}
                        className="rounded"
                      />
                      Precio a consultar
                    </label>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategoriesForType(listingType).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Real Estate Fields */}
              {metadataType === 'real_estate' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Propiedad</Label>
                      <Select value={propertyType} onValueChange={setPropertyType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="casa">Casa</SelectItem>
                          <SelectItem value="departamento">Departamento</SelectItem>
                          <SelectItem value="terreno">Terreno</SelectItem>
                          <SelectItem value="local">Local Comercial</SelectItem>
                          <SelectItem value="oficina">Oficina</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Operación</Label>
                      <Select value={transactionType} onValueChange={setTransactionType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="venta">Venta</SelectItem>
                          <SelectItem value="renta">Renta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Recámaras</Label>
                      <Input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="3" />
                    </div>
                    <div className="space-y-2">
                      <Label>Baños</Label>
                      <Input type="number" min="0" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="2" />
                    </div>
                    <div className="space-y-2">
                      <Label>Estacionamientos</Label>
                      <Input type="number" min="0" value={parkingSpots} onChange={(e) => setParkingSpots(e.target.value)} placeholder="2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>m² Construidos</Label>
                      <Input type="number" min="0" value={constructionM2} onChange={(e) => setConstructionM2(e.target.value)} placeholder="120" />
                    </div>
                    <div className="space-y-2">
                      <Label>m² Terreno</Label>
                      <Input type="number" min="0" value={lotM2} onChange={(e) => setLotM2(e.target.value)} placeholder="200" />
                    </div>
                  </div>
                </>
              )}

              {/* Automotive Fields */}
              {metadataType === 'automotive' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Marca</Label>
                      <Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" />
                    </div>
                    <div className="space-y-2">
                      <Label>Modelo</Label>
                      <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Tacoma" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Año</Label>
                      <Input type="number" min="1950" max="2027" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" />
                    </div>
                    <div className="space-y-2">
                      <Label>Kilómetros</Label>
                      <Input type="number" min="0" value={mileageKm} onChange={(e) => setMileageKm(e.target.value)} placeholder="45000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Transmisión</Label>
                      <Select value={transmission} onValueChange={setTransmission}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="automatica">Automática</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Combustible</Label>
                      <Select value={fuelType} onValueChange={setFuelType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gasolina">Gasolina</SelectItem>
                          <SelectItem value="diesel">Diésel</SelectItem>
                          <SelectItem value="electrico">Eléctrico</SelectItem>
                          <SelectItem value="hibrido">Híbrido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Blanco" />
                    </div>
                    <div className="space-y-2">
                      <Label>Puertas</Label>
                      <Select value={doors} onValueChange={setDoors}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              <LocationPicker
                city={city}
                stateRegion={stateRegion}
                onCityChange={setCity}
                onStateRegionChange={setStateRegion}
                onCountryCodeChange={setCountryCode}
              />

              <div className="space-y-2">
                <Label htmlFor="location">Colonia / Barrio</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej: Centro, La Rumorosa, Col. Libertad"
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
