'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { useRegion } from '@/lib/region-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Header } from '@/components/layout/header'
import { LocationPicker } from '@/components/listings/location-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RealEstateMetadata, AutomotiveMetadata, ListingType } from '@/lib/types/database'
import { firstListingError } from '@/lib/validation'
import Image from 'next/image'
import { BusinessTagPicker } from '@/components/listings/business-tag-picker'
import { Business } from '@/lib/types/database'
import {
  ImagePlus, X, Video, ChevronDown, ChevronUp,
  ShoppingBag, Handshake, CalendarHeart, Megaphone, Store,
  UtensilsCrossed, Star, AlertTriangle, Briefcase, Dog
} from 'lucide-react'

// Categories whose selection reveals structured real-estate fields. Values must
// match the search/filter category values exactly (lib/i18n categories).
const REAL_ESTATE_CATEGORIES = ['Casas en Renta', 'Casas en Venta', 'Terrenos']

const PRODUCT_CATEGORIES = [
  'Comida', 'Electrónica', 'Muebles', 'Vehículos', 'Ropa', 'Deportes',
  'Hogar', 'Juguetes', 'Libros', 'Mascotas',
  'Casas en Renta', 'Casas en Venta', 'Terrenos', 'Otros',
]

const SERVICE_CATEGORIES = [
  'Comida y Catering', 'Plomería', 'Electricidad', 'Albañilería', 'Pintura', 'Belleza y Uñas',
  'Reparaciones', 'Limpieza', 'Jardinería', 'Clases y Tutorías', 'Fletes y Mudanzas', 'Otros Servicios',
]

const EVENT_CATEGORIES = ['Eventos', 'Comida y Bebida', 'Anuncios Comunitarios', 'Empleos']

const NEWS_CATEGORIES = [
  'Noticias Locales', 'Reseñas y Recomendaciones', 'Objetos Perdidos', 'Seguridad Pública', 'Anuncios Comunitarios', 'Empleos',
]

// Quick shortcuts — popular topics that auto-select type + category
const QUICK_SHORTCUTS: {
  label: string
  Icon: React.ComponentType<{ className?: string }>
  type: ListingType
  category: string
  accent: string
  accentBg: string
  accentBorder: string
}[] = [
  { label: 'Comida', Icon: UtensilsCrossed, type: 'product', category: 'Comida', accent: 'text-gray-900', accentBg: 'bg-gray-100', accentBorder: 'border-gray-200' },
  { label: 'Reseña', Icon: Star, type: 'news', category: 'Reseñas y Recomendaciones', accent: 'text-gray-900', accentBg: 'bg-gray-100', accentBorder: 'border-gray-200' },
  { label: 'Empleo', Icon: Briefcase, type: 'news', category: 'Empleos', accent: 'text-gray-900', accentBg: 'bg-gray-100', accentBorder: 'border-gray-200' },
  { label: 'Perdido', Icon: Dog, type: 'news', category: 'Objetos Perdidos', accent: 'text-gray-900', accentBg: 'bg-gray-100', accentBorder: 'border-gray-200' },
  { label: 'Seguridad', Icon: AlertTriangle, type: 'news', category: 'Seguridad Pública', accent: 'text-gray-900', accentBg: 'bg-gray-100', accentBorder: 'border-gray-200' },
]

// Neutral type config — verbs describe what the user is DOING, not what they're selling
const TYPE_CONFIG: Record<ListingType, {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  verb: string
  titlePlaceholder: string
  descPlaceholder: string
  color: string
  colorBg: string
  colorBorder: string
}> = {
  product: {
    Icon: ShoppingBag,
    label: 'Algo en venta',
    verb: 'Vender o intercambiar',
    titlePlaceholder: 'Ej: iPhone 13, Mueble de cocina, Bicicleta...',
    descPlaceholder: 'Describe lo que ofreces: estado, detalles, por qué lo vendes...',
    color: 'text-gray-900',
    colorBg: 'bg-gray-100',
    colorBorder: 'border-gray-900',
  },
  service: {
    Icon: Handshake,
    label: 'Un servicio',
    verb: 'Ofrecer un servicio',
    titlePlaceholder: 'Ej: Plomero a domicilio, Clases de inglés...',
    descPlaceholder: 'Describe tu servicio: experiencia, zona, horarios, precios...',
    color: 'text-gray-900',
    colorBg: 'bg-gray-100',
    colorBorder: 'border-gray-900',
  },
  event: {
    Icon: CalendarHeart,
    label: 'Un evento',
    verb: 'Compartir un evento',
    titlePlaceholder: 'Ej: Bazar navideño, Torneo de futbol, Clase abierta...',
    descPlaceholder: 'Describe el evento: fecha, hora, lugar, costo de entrada...',
    color: 'text-gray-900',
    colorBg: 'bg-gray-100',
    colorBorder: 'border-gray-900',
  },
  news: {
    Icon: Megaphone,
    label: 'Noticia o aviso',
    verb: 'Informar a la comunidad',
    titlePlaceholder: 'Ej: Corte de agua mañana, Se busca perro perdido...',
    descPlaceholder: 'Describe lo que está pasando con todos los detalles relevantes...',
    color: 'text-gray-900',
    colorBg: 'bg-gray-100',
    colorBorder: 'border-gray-900',
  },
}

export default function NewListingPage() {
  const [listingType, setListingType] = useState<ListingType>('product')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [priceConsultar, setPriceConsultar] = useState(false)
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [stateRegion, setStateRegion] = useState('')
  const [gpsCountryCode, setGpsCountryCode] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [taggedBusiness, setTaggedBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

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

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { user, activeStore } = useAuth()
  const userCountry = useRegion()
  const t = useTranslations()
  const f = t.forms
  const storeType = activeStore?.store_type || 'general'
  const supabase = createClient()
  const config = TYPE_CONFIG[listingType]
  const showPrice = listingType !== 'news'

  // Structured fields are driven by the selected CATEGORY (available to everyone),
  // or by an active typed store — not gated on owning a store.
  const isRealEstate = storeType === 'real_estate' || REAL_ESTATE_CATEGORIES.includes(category)
  const isAutomotive = storeType === 'automotive' || category === 'Vehículos'

  // Stepped posting: same fields, same submission — only the presentation
  // changes. Step 1 = type + photos, step 2 = title/price/category/location,
  // step 3 = only this type's fields + Opciones adicionales, then Publish.
  // Types never bleed: real-estate and automotive blocks still render only
  // when isRealEstate / isAutomotive is true, exactly as before.
  const [step, setStep] = useState(1)
  const stepTitles = ['¿Qué quieres compartir?', 'Datos del anuncio', 'Detalles y publicar']
  const validateStep2 = (): string | null => {
    if (!title.trim()) return 'Escribe un título'
    if (!description.trim()) return 'Escribe una descripción'
    if (showPrice && !priceConsultar && !price) return 'Escribe un precio o marca Precio a consultar / Gratis'
    if (storeType === 'general' && !category) return 'Elige una categoría'
    return null
  }
  const goNext = () => {
    if (step === 2) {
      const err = validateStep2()
      if (err) { setError(err); return }
    }
    setError('')
    setStep(s => Math.min(3, s + 1))
    window.scrollTo({ top: 0 })
  }
  const goBack = () => { setError(''); setStep(s => Math.max(1, s - 1)); window.scrollTo({ top: 0 }) }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addImages(files)
  }

  const addImages = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length + images.length > 5) {
      setError(f.maxImagesError)
      return
    }
    setImages(prev => [...prev, ...imageFiles])
    const newPreviews = imageFiles.map(file => URL.createObjectURL(file))
    setImagePreviews(prev => [...prev, ...newPreviews])
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    addImages(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')

    try {
      let metadata = null
      if (isRealEstate) {
        // Derive transaction/property from the chosen category when present.
        const txn = category === 'Casas en Renta' ? 'renta'
          : category === 'Casas en Venta' ? 'venta'
          : transactionType
        const prop = category === 'Terrenos' ? 'terreno' : propertyType
        metadata = {
          type: 'real_estate',
          property_type: prop,
          transaction_type: txn,
          ...(bedrooms && { bedrooms: parseInt(bedrooms) }),
          ...(bathrooms && { bathrooms: parseInt(bathrooms) }),
          ...(constructionM2 && { construction_m2: parseInt(constructionM2) }),
          ...(lotM2 && { lot_m2: parseInt(lotM2) }),
          ...(parkingSpots && { parking_spots: parseInt(parkingSpots) }),
        } as RealEstateMetadata
      } else if (isAutomotive) {
        metadata = {
          type: 'automotive',
          make, model,
          ...(year && { year: parseInt(year) }),
          ...(mileageKm && { mileage_km: parseInt(mileageKm) }),
          transmission, fuel_type: fuelType,
          ...(color && { color }),
          ...(doors && { doors: parseInt(doors) }),
        } as AutomotiveMetadata
      }

      // Final category must match the search/filter values. For store users whose
      // category select is hidden, derive it from the store's property/transaction.
      let finalCategory = category
      if (storeType === 'real_estate') {
        finalCategory = propertyType === 'terreno'
          ? 'Terrenos'
          : transactionType === 'renta' ? 'Casas en Renta' : 'Casas en Venta'
      } else if (storeType === 'automotive') {
        finalCategory = 'Vehículos'
      }

      const parsedPrice = parseFloat(price)
      const finalPrice = listingType === 'news' ? 0 : priceConsultar ? 0 : (Number.isFinite(parsedPrice) ? parsedPrice : 0)

      // Step validation already ran on Next, but re-check here so a
      // direct submit can never publish with a missing required field.
      if (storeType === 'general' && !category) {
        setError('Elige una categoría')
        setLoading(false)
        return
      }
      if (isAutomotive && (!year || !make.trim() || !model.trim())) {
        setError('Completa año, marca y modelo del vehículo')
        setLoading(false)
        return
      }

      // Validate user input before touching the DB.
      const validationError = firstListingError({
        title,
        description,
        price: finalPrice,
        videoUrl: videoUrl || undefined,
      })
      if (validationError) {
        setError(validationError)
        setLoading(false)
        return
      }

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          store_id: activeStore?.id || null,
          listing_type: listingType,
          title, description,
          price: finalPrice,
          category: finalCategory,
          location: location || activeStore?.location || '',
          country_code: gpsCountryCode ?? userCountry ?? null,
          city: city || null,
          state_region: stateRegion || null,
          metadata,
          video_url: videoUrl || null,
          tagged_business_id: taggedBusiness?.id || null,
          status: 'active',
        })
        .select()
        .single()

      if (listingError) throw listingError

      // Create business tag junction record
      if (taggedBusiness) {
        await supabase.from('listing_business_tags').insert({
          listing_id: listing.id,
          business_id: taggedBusiness.id,
        })
      }

      if (images.length > 0) {
        // Track uploaded files so we can roll back if any upload/insert fails —
        // otherwise a partial failure leaves an orphaned listing behind and the
        // user retries, creating a duplicate.
        const uploadedPaths: string[] = []
        try {
          await Promise.all(images.map(async (file, index) => {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${listing.id}/${Date.now()}-${index}.${fileExt}`
            const { error: uploadError } = await supabase.storage.from('listing-images').upload(fileName, file)
            if (uploadError) throw uploadError
            uploadedPaths.push(fileName)
            const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(fileName)
            const { error: imgInsertError } = await supabase
              .from('listing_images')
              .insert({ listing_id: listing.id, image_url: publicUrl, order_index: index })
            if (imgInsertError) throw imgInsertError
          }))
        } catch (imgErr) {
          // Roll back uploaded files + the orphaned listing (cascade removes any
          // image rows and the business tag) before surfacing the error.
          if (uploadedPaths.length > 0) {
            await supabase.storage.from('listing-images').remove(uploadedPaths).catch(() => {})
          }
          await supabase.from('listings').delete().eq('id', listing.id).eq('user_id', user.id)
          throw imgErr
        }
      }

      router.push(`/listings/${listing.id}`)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Error al publicar')
      setLoading(false)
    }
  }

  const categoriesForType = listingType === 'service' ? SERVICE_CATEGORIES
    : listingType === 'event' ? EVENT_CATEGORIES
    : listingType === 'news' ? NEWS_CATEGORIES
    : PRODUCT_CATEGORIES

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-2xl">

        {/* ── Page header ── */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Compartir con la comunidad</h1>
          {activeStore ? (
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
              <Store className="h-3.5 w-3.5" />
              Publicando como <span className="font-medium">{activeStore.name}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400 mt-0.5">
              Tu publicación será visible para toda la comunidad
            </p>
          )}
        </div>

        {/* Step indicator */}
        <div className="mb-5">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${step >= n ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>{n}</span>
                {n < 3 && <span className={`h-px flex-1 ${step > n ? 'bg-gray-900' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm font-medium text-gray-900">{stepTitles[step - 1]}</p>
          <p className="text-xs text-gray-500">Paso {step} de 3</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-0">

          {/* ══════════════════════════════════════════════
              SECTION 1: MEDIA (Visual-first — this is the hook)
              ══════════════════════════════════════════════ */}
          {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => images.length < 5 && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all cursor-pointer
                ${isDragging
                  ? 'border-gray-900 bg-gray-100 scale-[1.01]'
                  : images.length > 0
                    ? 'border-gray-200 bg-gray-50/50'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100/50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />

              {imagePreviews.length === 0 ? (
                /* Empty state — inviting, not clinical */
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <ImagePlus className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Agrega fotos
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Arrastra aquí o toca para seleccionar (máx. 5)
                  </p>
                </div>
              ) : (
                /* Preview grid */
                <div className="p-3">
                  <div className={`grid gap-2 ${
                    imagePreviews.length === 1 ? 'grid-cols-1' :
                    imagePreviews.length === 2 ? 'grid-cols-2' :
                    'grid-cols-3'
                  }`}>
                    {imagePreviews.map((preview, index) => (
                      <div
                        key={index}
                        className={`relative rounded-lg overflow-hidden ${
                          imagePreviews.length === 1 ? 'aspect-[16/9]' : 'aspect-square'
                        }`}
                      >
                        <Image src={preview} alt={`Foto ${index + 1}`} fill className="object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(index) }}
                          className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 transition"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {/* Add more slot */}
                    {images.length < 5 && (
                      <div className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition">
                        <ImagePlus className="h-5 w-5 text-gray-300" />
                        <span className="text-[10px] text-gray-400 mt-1">{5 - images.length} más</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* ══════════════════════════════════════════════
              SECTION 2: WHAT ARE YOU SHARING? (Type + core info)
              ══════════════════════════════════════════════ */}
          {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-5">

            {/* Type selector */}
            {storeType === 'general' && (
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ¿Qué quieres compartir?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.entries(TYPE_CONFIG) as [ListingType, typeof config][]).map(([type, cfg]) => {
                    const isActive = listingType === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => { setListingType(type); setCategory('') }}
                        className={`
                          relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all
                          ${isActive
                            ? `${cfg.colorBorder} ${cfg.colorBg}`
                            : 'border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200'
                          }
                        `}
                      >
                        <cfg.Icon className={`h-5 w-5 ${isActive ? cfg.color : 'text-gray-400'}`} />
                        <span className={`text-xs font-medium leading-tight text-center ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                          {cfg.label}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Quick shortcuts — popular topics */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-gray-400 mr-0.5">Popular:</span>
                  {QUICK_SHORTCUTS.map((shortcut) => {
                    const isActive = listingType === shortcut.type && category === shortcut.category
                    return (
                      <button
                        key={shortcut.category}
                        type="button"
                        onClick={() => {
                          setListingType(shortcut.type)
                          setCategory(shortcut.category)
                        }}
                        className={`
                          inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium
                          border transition-all
                          ${isActive
                            ? `${shortcut.accentBg} ${shortcut.accentBorder} ${shortcut.accent}`
                            : 'border-gray-150 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-250'
                          }
                        `}
                      >
                        <shortcut.Icon className={`h-3 w-3 ${isActive ? shortcut.accent : 'text-gray-400'}`} />
                        {shortcut.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
          )}

          {step === 2 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm">
                {listingType === 'news' ? 'Titular' : 'Título'} <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder={config.titlePlaceholder}
                className="text-base"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm">
                Descripción <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder={config.descPlaceholder}
                rows={listingType === 'news' ? 6 : 4}
                className="resize-none"
              />
            </div>

            {/* Price + Category row (contextual) */}
            <div className={`grid gap-4 ${showPrice ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Price — only for non-news */}
              {showPrice && (
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-sm">
                    Precio (MXN) {!priceConsultar && <span className="text-red-400">*</span>}
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
                    placeholder={priceConsultar ? 'A consultar' : '0.00'}
                  />
                  {(listingType === 'service' || listingType === 'event') && (
                    <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={priceConsultar}
                        onChange={(e) => { setPriceConsultar(e.target.checked); if (e.target.checked) setPrice('') }}
                        className="rounded border-gray-300"
                      />
                      Precio a consultar / Gratis
                    </label>
                  )}
                </div>
              )}

              {/* Category */}
              {storeType === 'general' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-sm">
                    Categoría <span className="text-red-400">*</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Elige una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesForType.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {t.categories.find(c => c.value === cat)?.label ?? cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : storeType === 'real_estate' ? (
                <div className="space-y-1.5">
                  <Label className="text-sm">Tipo de Operación *</Label>
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venta">Venta</SelectItem>
                      <SelectItem value="renta">Renta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

          </div>
          )}

          {step === 3 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-5">
            {/* Real Estate Fields — only for real-estate categories/stores */}
            {isRealEstate && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm">Tipo de Propiedad *</Label>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5"><Label className="text-sm">Recámaras</Label><Input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="3" /></div>
                  <div className="space-y-1.5"><Label className="text-sm">Baños</Label><Input type="number" min="0" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="2" /></div>
                  <div className="space-y-1.5"><Label className="text-sm">Estacionamientos</Label><Input type="number" min="0" value={parkingSpots} onChange={(e) => setParkingSpots(e.target.value)} placeholder="2" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="text-sm">m² Construidos</Label><Input type="number" min="0" value={constructionM2} onChange={(e) => setConstructionM2(e.target.value)} placeholder="120" /></div>
                  <div className="space-y-1.5"><Label className="text-sm">m² Terreno</Label><Input type="number" min="0" value={lotM2} onChange={(e) => setLotM2(e.target.value)} placeholder="200" /></div>
                </div>
              </>
            )}

            {/* Automotive Fields — only for vehicles */}
            {isAutomotive && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm">Año *</Label>
                  <Input type="number" min="1950" max="2027" value={year} onChange={(e) => setYear(e.target.value)} required placeholder="2024" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label className="text-sm">Marca *</Label><Input value={make} onChange={(e) => setMake(e.target.value)} required placeholder="Toyota" /></div>
                  <div className="space-y-1.5"><Label className="text-sm">Modelo *</Label><Input value={model} onChange={(e) => setModel(e.target.value)} required placeholder="Tacoma" /></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5"><Label className="text-sm">Kilómetros</Label><Input type="number" min="0" value={mileageKm} onChange={(e) => setMileageKm(e.target.value)} placeholder="45000" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Transmisión</Label>
                    <Select value={transmission} onValueChange={setTransmission}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automatica">Automática</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Combustible</Label>
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
                  <div className="space-y-1.5"><Label className="text-sm">Color</Label><Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Blanco" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Puertas</Label>
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
            {!isRealEstate && !isAutomotive && (
              <p className="text-sm text-gray-500">No hay detalles adicionales para este tipo. Puedes agregar un video o etiquetar un negocio en Opciones adicionales abajo.</p>
            )}
          </div>
          )}

          {step === 2 && (<>
          {/* ══════════════════════════════════════════════
              SECTION 3: LOCATION
              ══════════════════════════════════════════════ */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</p>
            <LocationPicker
              city={city}
              stateRegion={stateRegion}
              onCityChange={setCity}
              onStateRegionChange={setStateRegion}
              onCountryCodeChange={setGpsCountryCode}
            />
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-sm">Colonia / Barrio</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej: Centro, La Rumorosa, Col. Libertad"
              />
            </div>
          </div>
          </>)}

          {step === 3 && (<>
          {/* ══════════════════════════════════════════════
              SECTION 4: EXTRAS (collapsible — reduce overwhelm)
              ══════════════════════════════════════════════ */}
          <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition"
            >
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Opciones adicionales
              </span>
              {showAdvanced
                ? <ChevronUp className="h-4 w-4 text-gray-400" />
                : <ChevronDown className="h-4 w-4 text-gray-400" />
              }
            </button>

            {showAdvanced && (
              <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">
                {/* Video URL */}
                <div className="space-y-1.5">
                  <Label htmlFor="videoUrl" className="flex items-center gap-1.5 text-sm">
                    <Video className="h-3.5 w-3.5 text-gray-400" />
                    Video
                  </Label>
                  <Input
                    id="videoUrl"
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... o link de Facebook/TikTok"
                  />
                  <p className="text-[11px] text-gray-400">
                    Pega un enlace de YouTube, Facebook o TikTok
                  </p>
                </div>

                {/* Business Tag */}
                <BusinessTagPicker
                  value={taggedBusiness}
                  onChange={setTaggedBusiness}
                  location={location || undefined}
                  category={category || undefined}
                />
              </div>
            )}
          </div>
          </>)}

          {/* ══════════════════════════════════════════════
              SECTION 5: NAVIGATION / SUBMIT
              ══════════════════════════════════════════════ */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={goBack} disabled={loading} className="h-12 px-6 rounded-xl">
                Atrás
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" onClick={goNext} disabled={loading} className="flex-1 h-12 text-base font-medium rounded-xl">
                Siguiente
              </Button>
            ) : (
              <Button type="submit" disabled={loading} className="flex-1 h-12 text-base font-medium rounded-xl">
                {loading ? 'Publicando...' : 'Publicar'}
              </Button>
            )}
            {step === 1 && (
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="h-12 px-6 rounded-xl">
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}
