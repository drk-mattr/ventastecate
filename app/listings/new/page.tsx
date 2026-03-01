'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { useRegion } from '@/lib/region-context'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RealEstateMetadata, AutomotiveMetadata, ListingType } from '@/lib/types/database'
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

const LISTING_TYPE_OPTIONS: { value: ListingType; icon: string; label: string }[] = [
  { value: 'product', icon: '📦', label: 'Producto' },
  { value: 'service', icon: '🔧', label: 'Servicio' },
  { value: 'event', icon: '📢', label: 'Evento' },
]

export default function NewListingPage() {
  const [listingType, setListingType] = useState<ListingType>('product')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [priceConsultar, setPriceConsultar] = useState(false)
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
  const { user, activeStore } = useAuth()
  const userCountry = useRegion()
  const storeType = activeStore?.store_type || 'general'
  const supabase = createClient()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length > 5) {
      setError('Máximo 5 imágenes permitidas')
      return
    }

    setImages([...images, ...files])
    
    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setImagePreviews([...imagePreviews, ...newPreviews])
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setImages(newImages)
    setImagePreviews(newPreviews)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')

    try {
      // Build metadata based on store type
      let metadata = null
      if (storeType === 'real_estate') {
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
      } else if (storeType === 'automotive') {
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

      // Determine category for specialized store types
      let finalCategory = category
      if (storeType === 'real_estate') finalCategory = 'Inmuebles'
      else if (storeType === 'automotive') finalCategory = 'Vehículos'

      // Create the listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          store_id: activeStore?.id || null,
          listing_type: listingType,
          title,
          description,
          price: priceConsultar ? 0 : parseFloat(price),
          category: finalCategory,
          location: location || activeStore?.location || '',
          country_code: userCountry ?? null,
          metadata,
          status: 'active',
        })
        .select()
        .single()

      if (listingError) throw listingError

      // Upload images
      if (images.length > 0) {
        const imageUploads = images.map(async (file, index) => {
          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}/${listing.id}/${Date.now()}-${index}.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from('listing-images')
            .upload(fileName, file)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('listing-images')
            .getPublicUrl(fileName)

          // Save image record
          await supabase
            .from('listing_images')
            .insert({
              listing_id: listing.id,
              image_url: publicUrl,
              order_index: index,
            })
        })

        await Promise.all(imageUploads)
      }

      router.push(`/listings/${listing.id}`)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Error al crear el anuncio')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Crear Nuevo Anuncio</CardTitle>
            <CardDescription>
              {activeStore
                ? `Publicando como 🏪 ${activeStore.name}`
                : 'Completa la información de tu producto'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Listing type selector */}
              {storeType === 'general' && (
                <div className="space-y-2">
                  <Label>Tipo de publicación</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {LISTING_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setListingType(opt.value); setCategory('') }}
                        className={`p-3 rounded-lg border-2 text-center transition ${
                          listingType === opt.value
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl block mb-1">{opt.icon}</span>
                        <span className="text-xs font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder={listingType === 'service' ? 'Ej: Se pintan Casas' : listingType === 'event' ? 'Ej: Gran Bazar Navideño' : 'Ej: iPhone 13 Pro Max'}
                />
                {listingType !== 'product' && (
                  <p className="text-xs text-gray-500">
                    💡 Si no agregas imágenes, el título se mostrará como portada de tu anuncio
                  </p>
                )}
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
                  <Label htmlFor="price">
                    Precio (MXN) {priceConsultar ? '' : '*'}
                  </Label>
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

                {storeType === 'general' ? (
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría *</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {(listingType === 'service' ? SERVICE_CATEGORIES : listingType === 'event' ? EVENT_CATEGORIES : PRODUCT_CATEGORIES).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : storeType === 'real_estate' ? (
                  <div className="space-y-2">
                    <Label>Tipo de Operación *</Label>
                    <Select value={transactionType} onValueChange={setTransactionType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="venta">Venta</SelectItem>
                        <SelectItem value="renta">Renta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="year">Año *</Label>
                    <Input
                      id="year"
                      type="number"
                      min="1950"
                      max="2027"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      required
                      placeholder="2024"
                    />
                  </div>
                )}
              </div>

              {/* Real Estate Fields */}
              {storeType === 'real_estate' && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo de Propiedad *</Label>
                    <Select value={propertyType} onValueChange={setPropertyType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casa">Casa</SelectItem>
                        <SelectItem value="departamento">Departamento</SelectItem>
                        <SelectItem value="terreno">Terreno</SelectItem>
                        <SelectItem value="local">Local Comercial</SelectItem>
                        <SelectItem value="oficina">Oficina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bedrooms">Recámaras</Label>
                      <Input id="bedrooms" type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="3" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bathrooms">Baños</Label>
                      <Input id="bathrooms" type="number" min="0" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="2" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parking">Estacionamientos</Label>
                      <Input id="parking" type="number" min="0" value={parkingSpots} onChange={(e) => setParkingSpots(e.target.value)} placeholder="2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="constructionM2">m² Construidos</Label>
                      <Input id="constructionM2" type="number" min="0" value={constructionM2} onChange={(e) => setConstructionM2(e.target.value)} placeholder="120" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lotM2">m² Terreno</Label>
                      <Input id="lotM2" type="number" min="0" value={lotM2} onChange={(e) => setLotM2(e.target.value)} placeholder="200" />
                    </div>
                  </div>
                </>
              )}

              {/* Automotive Fields */}
              {storeType === 'automotive' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="make">Marca *</Label>
                      <Input id="make" value={make} onChange={(e) => setMake(e.target.value)} required placeholder="Toyota" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Modelo *</Label>
                      <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} required placeholder="Tacoma" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mileage">Kilómetros</Label>
                      <Input id="mileage" type="number" min="0" value={mileageKm} onChange={(e) => setMileageKm(e.target.value)} placeholder="45000" />
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Blanco" />
                    </div>
                    <div className="space-y-2">
                      <Label>Puertas</Label>
                      <Select value={doors} onValueChange={setDoors}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 puertas</SelectItem>
                          <SelectItem value="4">4 puertas</SelectItem>
                          <SelectItem value="5">5 puertas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

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
                <Label htmlFor="images">
                  Imágenes (Máximo 5){listingType !== 'product' ? ' — Opcional' : ''}
                </Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={images.length >= 5}
                />
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square">
                        <Image
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
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
                  {loading ? 'Creando...' : 'Publicar Anuncio'}
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
