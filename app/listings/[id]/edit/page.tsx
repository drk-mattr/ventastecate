'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Header } from '@/components/layout/header'
import { LocationPicker } from '@/components/listings/location-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RealEstateMetadata, AutomotiveMetadata, ListingMetadata, ListingType } from '@/lib/types/database'
import { firstListingError, MAX_LISTING_IMAGES } from '@/lib/validation'
import { normalizeTownName } from '@/lib/business-regions'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Check } from 'lucide-react'
import { CARD_COLORS, type CardColorId } from '@/lib/listings/card-colors'

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

const NEWS_CATEGORIES = [
  'Noticias',
  'Objetos Perdidos',
  'Seguridad Pública',
  'Anuncios Comunitarios',
  'Empleos',
]

function getCategoriesForType(type: ListingType) {
  if (type === 'service') return SERVICE_CATEGORIES
  if (type === 'event') return EVENT_CATEGORIES
  if (type === 'news') return NEWS_CATEGORIES
  return PRODUCT_CATEGORIES
}

// Split a stored ISO instant into date/time inputs in America/Tijuana
// (the Worker renders in UTC; the inputs must show Baja local time).
// A stored midnight local time means date-only (see
// lib/listings/event-dates.ts), so the time input stays empty.
function eventIsoToParts(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Tijuana',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const hour = Number(get('hour')) % 24 // hour12:false can yield "24" for midnight
  const minute = get('minute')
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: hour === 0 && minute === '00' ? '' : `${String(hour).padStart(2, '0')}:${minute}`,
  }
}

// Date + optional time inputs back to a stored ISO instant, mirroring
// the posting form (local time → UTC ISO).
function eventPartsToIso(date: string, time: string): string | null {
  if (!date) return null
  const d = new Date(`${date}T${time || '00:00'}:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

interface ExistingImage {
  id: string
  image_url: string
  order_index: number
}

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const t = useTranslations()
  const f = t.forms

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
  // Currency (migration 038) + Gratis as its own state (not consultar).
  const [currency, setCurrency] = useState<'MXN' | 'USD'>('MXN')
  const [isFree, setIsFree] = useState(false)
  // Title-card color (migration 039): news/event only, used when the
  // post has no photo.
  const [cardColor, setCardColor] = useState<CardColorId>('orange')
  // Structured event fields (migration 043): events only. Time is
  // optional — a date with no time is stored at local midnight and
  // shown as a day only (see lib/listings/event-dates.ts).
  const [eventStartDate, setEventStartDate] = useState('')
  const [eventStartTime, setEventStartTime] = useState('')
  const [eventEndDate, setEventEndDate] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')
  const [eventVenue, setEventVenue] = useState('')
  const [eventTicketUrl, setEventTicketUrl] = useState('')
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

  const TYPE_LABELS: Record<ListingType, { icon: string; label: string }> = {
    product: { icon: '📦', label: f.typeProductLabel },
    service: { icon: '🔧', label: f.typeServiceLabel },
    event: { icon: '📢', label: f.typeEventLabel },
    news: { icon: '📰', label: f.typeNewsLabel },
  }

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
      setCurrency((listing.currency as 'MXN' | 'USD') || 'MXN')
      setIsFree(!!listing.is_free)
      setCardColor((listing.card_color as CardColorId) || 'orange')
      setPriceConsultar(listing.price === 0 && !listing.is_free)
      setCategory(listing.category)
      setLocation(listing.location)
      setCity(listing.city || '')
      setStateRegion(listing.state_region || '')
      setCountryCode(listing.country_code || null)
      setStatus(listing.status)
      setListingType(listing.listing_type || 'product')
      // Structured event fields (043) — prefill the inputs from the
      // stored values. A non-event has none; an event keeps whatever
      // it had until the owner changes it.
      const startParts = eventIsoToParts(listing.event_starts_at)
      setEventStartDate(startParts.date)
      setEventStartTime(startParts.time)
      const endParts = eventIsoToParts(listing.event_ends_at)
      setEventEndDate(endParts.date)
      setEventEndTime(endParts.time)
      setEventVenue(listing.event_venue || '')
      setEventTicketUrl(listing.event_ticket_url || '')
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
    if (files.length + totalImages > MAX_LISTING_IMAGES) {
      setError(f.maxImagesError)
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
      const finalPrice = (priceConsultar || isFree) ? 0 : parseFloat(price)

      // Validate user input before touching the DB.
      const validationError = firstListingError({ title, description, price: finalPrice })
      if (validationError) {
        setError(validationError)
        setLoading(false)
        return
      }

      // Events need a start date — it is the whole point of the post.
      // Time, end date, venue, and ticket link stay optional.
      if (listingType === 'event') {
        if (!eventStartDate) {
          setError('Ponle fecha a tu evento')
          setLoading(false)
          return
        }
        const startMs = new Date(`${eventStartDate}T${eventStartTime || '00:00'}:00`).getTime()
        const endMs = eventEndDate ? new Date(`${eventEndDate}T${eventEndTime || '00:00'}:00`).getTime() : NaN
        if (eventEndDate && !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs < startMs) {
          setError('El término no puede ser antes del inicio')
          setLoading(false)
          return
        }
        if (eventTicketUrl && !/^https?:\/\//i.test(eventTicketUrl.trim())) {
          setError('El enlace debe empezar con https://')
          setLoading(false)
          return
        }
      }

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

      // Update listing fields — currency + Gratis (migration 038) +
      // title-card color (039) + structured event fields (043), with
      // the same 42703 retry-without-them fallback the new form uses:
      // pre-migration the columns don't exist yet. Event fields ride
      // only for events, so editing any other type never touches them.
      const eventUpdate = listingType === 'event' ? {
        event_starts_at: eventPartsToIso(eventStartDate, eventStartTime),
        event_ends_at: eventPartsToIso(eventEndDate, eventEndTime),
        event_venue: eventVenue.trim() || null,
        event_ticket_url: eventTicketUrl.trim() || null,
      } : {}
      const updateBase = {
        title,
        description,
        price: finalPrice,
        category,
        location,
        city: normalizeTownName(city),
        state_region: stateRegion || null,
        country_code: countryCode,
        metadata,
        status,
      }
      let updateError = (await supabase
        .from('listings')
        .update({ ...updateBase, currency, is_free: isFree, card_color: cardColor, ...eventUpdate })
        .eq('id', id)
        .eq('user_id', user.id)).error
      if (updateError && (updateError.code === '42703' || updateError.code === 'PGRST204')) {
        updateError = (await supabase
          .from('listings')
          .update(updateBase)
          .eq('id', id)
          .eq('user_id', user.id)).error
      }

      if (updateError) throw updateError

      // Upload new images FIRST — only delete the removed ones once the new
      // uploads have succeeded, so a failed upload can't destroy existing images.
      if (newImages.length > 0) {
        const keptImages = existingImages.filter(img => !removedImageIds.includes(img.id))
        const orderStart = keptImages.length
        const uploadedPaths: string[] = []

        try {
          await Promise.all(newImages.map(async (file, index) => {
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${id}/${Date.now()}-${index}.${fileExt}`

            const { error: uploadError } = await supabase.storage
              .from('listing-images')
              .upload(fileName, file)
            if (uploadError) throw uploadError
            uploadedPaths.push(fileName)

            const { data: { publicUrl } } = supabase.storage
              .from('listing-images')
              .getPublicUrl(fileName)

            const { error: imgInsertError } = await supabase
              .from('listing_images')
              .insert({ listing_id: id, image_url: publicUrl, order_index: orderStart + index })
            if (imgInsertError) throw imgInsertError
          }))
        } catch (imgErr) {
          // Roll back the partial upload and leave existing images untouched.
          if (uploadedPaths.length > 0) {
            await supabase.storage.from('listing-images').remove(uploadedPaths).catch(() => {})
          }
          throw imgErr
        }
      }

      // Now that new images are safely stored, remove the deleted ones.
      if (removedImageIds.length > 0) {
        const toRemove = existingImages.filter(img => removedImageIds.includes(img.id))

        for (const img of toRemove) {
          const path = img.image_url.split('/listing-images/')[1]
          if (path) {
            await supabase.storage.from('listing-images').remove([path])
          }
        }

        await supabase
          .from('listing_images')
          .delete()
          .in('id', removedImageIds)
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
          <p className="text-center text-gray-500">{f.loadingListing}</p>
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
                <CardTitle>{f.editListing}</CardTitle>
                <CardDescription>{f.modifyInfo}</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {TYPE_LABELS[listingType].icon} {TYPE_LABELS[listingType].label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">
                  {listingType === 'news' || listingType === 'event' ? f.headlineLabel : f.titleLabel}
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Ej: iPhone 13 Pro Max"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{f.descriptionLabel}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder={f.descriptionPlaceholder}
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">{f.priceLabel} {(priceConsultar || isFree) ? '' : '*'}</Label>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required={!priceConsultar && !isFree}
                        disabled={priceConsultar || isFree}
                        placeholder={isFree ? 'Gratis' : priceConsultar ? f.consultPricePlaceholder : '1000.00'}
                      />
                    </div>
                    {/* Currency — MXN default; USD for cars, rent, etc. */}
                    <div className="flex shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-0.5" role="group" aria-label="Moneda">
                      {(['MXN', 'USD'] as const).map((cur) => (
                        <button
                          key={cur}
                          type="button"
                          onClick={() => setCurrency(cur)}
                          aria-pressed={currency === cur}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${currency === cur ? 'bg-gray-900 text-white' : 'text-gray-500'}`}
                        >
                          {cur}
                        </button>
                      ))}
                    </div>
                  </div>
                  {listingType !== 'news' && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={priceConsultar}
                          onChange={(e) => { setPriceConsultar(e.target.checked); if (e.target.checked) { setPrice(''); setIsFree(false) } }}
                          className="rounded"
                        />
                        {f.priceConsultCheckbox}
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFree}
                          onChange={(e) => { setIsFree(e.target.checked); if (e.target.checked) { setPrice(''); setPriceConsultar(false) } }}
                          className="rounded"
                        />
                        {f.priceFreeCheckbox}
                      </label>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">{f.categoryLabel}</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder={f.selectCategoryPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategoriesForType(listingType).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {t.categories.find(c => c.value === cat)?.label ?? cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fecha y lugar — events only (migration 043). The date is
                  what the card and the detail page show; the time is
                  optional, and a date with no time shows as a day only. */}
              {listingType === 'event' && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                  <div>
                    <p className="text-sm font-medium">Fecha y lugar</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      La fecha se muestra en la tarjeta y en la página del evento. Si no pones hora, solo se muestra el día.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="event-start-date" className="text-sm">
                        Fecha de inicio <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="event-start-date"
                        type="date"
                        value={eventStartDate}
                        onChange={(e) => setEventStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="event-start-time" className="text-sm">Hora</Label>
                      <Input
                        id="event-start-time"
                        type="time"
                        value={eventStartTime}
                        onChange={(e) => setEventStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="event-end-date" className="text-sm">Fecha de término</Label>
                      <Input
                        id="event-end-date"
                        type="date"
                        value={eventEndDate}
                        onChange={(e) => setEventEndDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="event-end-time" className="text-sm">Hora</Label>
                      <Input
                        id="event-end-time"
                        type="time"
                        value={eventEndTime}
                        onChange={(e) => setEventEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="event-venue" className="text-sm">Lugar / sede</Label>
                    <Input
                      id="event-venue"
                      value={eventVenue}
                      onChange={(e) => setEventVenue(e.target.value)}
                      maxLength={120}
                      placeholder="Ej: Arena Tecate, Unidad Deportiva CREA…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="event-ticket-url" className="text-sm">Enlace de boletos</Label>
                    <Input
                      id="event-ticket-url"
                      type="url"
                      inputMode="url"
                      value={eventTicketUrl}
                      onChange={(e) => setEventTicketUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                </div>
              )}

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
                country={countryCode ?? 'MX'}
                onCityChange={setCity}
                onStateRegionChange={setStateRegion}
                onCountryChange={(code) => setCountryCode(code)}
                onCountryCodeChange={setCountryCode}
              />

              <div className="space-y-2">
                <Label htmlFor="location">{f.neighborhoodLabel}</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={f.neighborhoodPlaceholder}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{f.statusLabel}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{f.statusActive}</SelectItem>
                    <SelectItem value="sold">{f.statusSold}</SelectItem>
                    <SelectItem value="inactive">{f.statusInactive}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Existing Images */}
              <div className="space-y-2">
                <Label>{f.currentImages}</Label>
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
                  <p className="text-sm text-gray-500">{f.noImages}</p>
                )}
              </div>

              {/* New Images */}
              <div className="space-y-2">
                <Label htmlFor="images">{f.addImages}</Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={totalImages >= MAX_LISTING_IMAGES}
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

              {/* Title-card color — news/event only. The card only
                  renders when the post has no photo. */}
              {(listingType === 'news' || listingType === 'event') && (
                <div className="space-y-2">
                  <Label>Color de la tarjeta</Label>
                  <p className="text-xs text-gray-400">
                    Si no tiene foto, la publicación se muestra como una tarjeta con el título en este color.
                  </p>
                  <div className="flex items-center gap-2.5" role="group" aria-label="Color de la tarjeta">
                    {CARD_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCardColor(c.id)}
                        aria-pressed={cardColor === c.id}
                        aria-label={c.label}
                        title={c.label}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition ${cardColor === c.id ? 'ring-2 ring-gray-900 ring-offset-2' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {cardColor === c.id && <Check className="h-4 w-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? f.saving : f.saveChanges}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  {f.cancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
