'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { RealEstateMetadata, AutomotiveMetadata, ListingType } from '@/lib/types/database'
import { firstListingError, LISTING_TITLE_MAX, LISTING_DESC_MAX } from '@/lib/validation'
import { normalizeTownName, LOCATION_COOKIE, TOWN_REGIONS, townsForLocation } from '@/lib/business-regions'
import { compressImage } from '@/lib/images/compress'
import { humanizePostError } from '@/lib/errors'
import { useListingDraft, draftKeyForUser } from '@/lib/hooks/use-listing-draft'
import Image from 'next/image'
import { BusinessTagPicker } from '@/components/listings/business-tag-picker'
import { ItemTagPicker } from '@/components/listings/item-tag-picker'
import type { SelectedItemTag } from '@/lib/items/types'
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
  'Noticias', 'Reseñas y Recomendaciones', 'Objetos Perdidos', 'Seguridad Pública', 'Anuncios Comunitarios', 'Empleos',
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

function categoriesForType(type: ListingType): string[] {
  if (type === 'service') return SERVICE_CATEGORIES
  if (type === 'event') return EVENT_CATEGORIES
  if (type === 'news') return NEWS_CATEGORIES
  return PRODUCT_CATEGORIES
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
  // Posting country is the seller's choice, default MX for the Tecate market.
  // It must NOT fall back to the site's locked language region (which is MX
  // for everyone, including San Diego sellers on US connections) — that
  // mislabelled manually typed San Diego posts as Mexico.
  const [countryCode, setCountryCode] = useState('MX')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [taggedBusiness, setTaggedBusiness] = useState<Business | null>(null)
  // Items engine (§8, 034B): optional offering tags for the tagged
  // business. First selected = primary, the rest secondary.
  const [selectedItems, setSelectedItems] = useState<SelectedItemTag[]>([])
  const handleBusinessChange = (biz: Business | null) => {
    setTaggedBusiness(biz)
    // Offerings belong to one business — a different business (or
    // none) invalidates the selection.
    setSelectedItems([])
  }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Inline per-field errors (shown under the offending field) + the id
  // of the first one, so submit can scroll to it.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  // Image upload progress: { done, total } while uploading, null otherwise.
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [compressing, setCompressing] = useState(false)
  // When the listing is already live but photos/tags failed, the form
  // switches to "published" mode: no re-submit, just retry + view links.
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null)
  const [failedImages, setFailedImages] = useState<File[]>([])
  const [tagWarning, setTagWarning] = useState<'business' | 'items' | null>(null)
  // WhatsApp opt-in at posting time (P1-6) — only when the seller has
  // no number on their profile yet.
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [draftRestored, setDraftRestored] = useState(false)

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
  const { user, profile, activeStore } = useAuth()
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

  // ── Device draft (P0-1) ──
  // The draft value is the whole form; the hook debounces the
  // localStorage write. Photos are excluded (File objects can't
  // serialize) — the text is what a draft saves.
  const draftValue = {
    listingType, title, description, price, priceConsultar, category,
    location, city, stateRegion, countryCode, videoUrl,
    taggedBusinessId: taggedBusiness?.id ?? null,
    selectedItems,
    propertyType, transactionType, bedrooms, bathrooms, constructionM2,
    lotM2, parkingSpots, make, model, year, mileageKm, transmission,
    fuelType, color, doors, whatsappOptIn, whatsappNumber, showAdvanced,
  }
  const restoreDraft = (d: typeof draftValue) => {
    setListingType((d.listingType as ListingType) || 'product')
    setTitle(d.title || '')
    setDescription(d.description || '')
    setPrice(d.price || '')
    setPriceConsultar(!!d.priceConsultar)
    setCategory(d.category || '')
    setLocation(d.location || '')
    setCity(d.city || '')
    setStateRegion(d.stateRegion || '')
    setCountryCode(d.countryCode || 'MX')
    setVideoUrl(d.videoUrl || '')
    setSelectedItems((d.selectedItems as SelectedItemTag[]) || [])
    setPropertyType(d.propertyType || 'casa')
    setTransactionType(d.transactionType || 'venta')
    setBedrooms(d.bedrooms || '')
    setBathrooms(d.bathrooms || '')
    setConstructionM2(d.constructionM2 || '')
    setLotM2(d.lotM2 || '')
    setParkingSpots(d.parkingSpots || '')
    setMake(d.make || '')
    setModel(d.model || '')
    setYear(d.year || '')
    setMileageKm(d.mileageKm || '')
    setTransmission(d.transmission || 'automatica')
    setFuelType(d.fuelType || 'gasolina')
    setColor(d.color || '')
    setDoors(d.doors || '4')
    setWhatsappOptIn(!!d.whatsappOptIn)
    setWhatsappNumber(d.whatsappNumber || '')
    setShowAdvanced(!!d.showAdvanced)
    if (d.taggedBusinessId) {
      // Restore the full business row so the picker has a real object.
      createClient().from('businesses').select('*').eq('id', d.taggedBusinessId).single()
        .then(({ data }) => { if (data) setTaggedBusiness(data as Business) })
    }
    setDraftRestored(true)
  }
  const { clearDraft, didRestore } = useListingDraft({
    storageKey: draftKeyForUser(user?.id),
    value: draftValue,
    onRestore: restoreDraft,
  })

  // Prefill city/state/country from the site region (P0-3). Runs once,
  // after the draft decision: a restored draft's city wins; only an
  // empty city gets the region's first town. GPS detect stays as an
  // override afterwards.
  const prefillDoneRef = useRef(false)
  const prefillLocationFromRegion = () => {
    try {
      const match = document.cookie
        .split('; ')
        .find((c) => c.startsWith(`${LOCATION_COOKIE}=`))
      const label = match ? decodeURIComponent(match.split('=')[1] ?? '') : null
      const towns = townsForLocation(label)
      const town = towns?.[0] ?? 'Tecate'
      const info = TOWN_REGIONS[town]
      setCity(town)
      if (info) {
        setStateRegion(info.state)
        setCountryCode(info.country)
      }
    } catch {
      // Cookie unreadable — the fields stay blank as before.
    }
  }
  useEffect(() => {
    if (!didRestore || prefillDoneRef.current) return
    prefillDoneRef.current = true
    if (city) return
    prefillLocationFromRegion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [didRestore])

  // Reset the whole form (used by "Descartar" on a restored draft).
  const resetForm = () => {
    clearDraft()
    setListingType('product')
    setTitle(''); setDescription(''); setPrice(''); setPriceConsultar(false)
    setCategory(''); setLocation(''); setCity(''); setStateRegion(''); setCountryCode('MX')
    setGpsCountryCode(null); setVideoUrl(''); setTaggedBusiness(null); setSelectedItems([])
    setPropertyType('casa'); setTransactionType('venta'); setBedrooms(''); setBathrooms('')
    setConstructionM2(''); setLotM2(''); setParkingSpots('')
    setMake(''); setModel(''); setYear(''); setMileageKm(''); setTransmission('automatica')
    setFuelType('gasolina'); setColor(''); setDoors('4')
    setWhatsappOptIn(false); setWhatsappNumber('')
    imagePreviews.forEach((u) => URL.revokeObjectURL(u))
    setImages([]); setImagePreviews([])
    setFieldErrors({}); setError(''); setDraftRestored(false)
    setPublishedListingId(null); setFailedImages([]); setTagWarning(null)
    setUploadProgress(null)
    prefillLocationFromRegion()
  }

  // Single-page form validation: returns per-field errors + the id of
  // the first offending field, so submit can scroll to it.
  const validateForm = (): { errors: Record<string, string>; firstId: string | null } => {
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Escribe un título'
    if (!description.trim()) errors.description = 'Escribe una descripción'
    if (showPrice && !priceConsultar && !price) errors.price = 'Escribe un precio, o marca Precio a consultar / Gratis'
    if (storeType === 'general' && !category) errors.category = 'Elige una categoría'
    const firstId = errors.title
      ? 'title'
      : errors.description
        ? 'description'
        : errors.price
          ? 'price'
          : errors.category
            ? 'category-field'
            : null
    return { errors, firstId }
  }

  const scrollToField = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addImages(files)
  }

  const addImages = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length + images.length > 5) {
      setError(f.maxImagesError)
      return
    }
    // Compress on-device before anything else (P0-2): a phone photo
    // is 3-8 MB raw; the compressed file is what gets previewed and
    // uploaded. A compression failure keeps the original file.
    setCompressing(true)
    try {
      const compressed = await Promise.all(imageFiles.map((file) => compressImage(file)))
      setImages(prev => [...prev, ...compressed])
      const newPreviews = compressed.map(file => URL.createObjectURL(file))
      setImagePreviews(prev => [...prev, ...newPreviews])
    } finally {
      setCompressing(false)
    }
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  // Revoke preview object URLs on unmount so long posting sessions
  // don't leak memory (previews are revoked individually on remove).
  const previewsRef = useRef<string[]>([])
  previewsRef.current = imagePreviews
  useEffect(() => {
    const ref = previewsRef
    return () => {
      ref.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

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

  // Upload files one at a time, in order, reporting progress. Returns
  // the files that failed (empty when all succeeded). A failure stops
  // the loop — the caller keeps the listing and offers a retry for the
  // failed photos only (P0-1: never delete the listing and wipe the
  // form over an upload failure).
  const uploadImagesSequential = async (
    listingId: string,
    files: File[],
    startOrder: number,
  ): Promise<{ failed: File[]; uploaded: number }> => {
    let uploaded = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user?.id}/${listingId}/${Date.now()}-${startOrder + i}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('listing-images').upload(fileName, file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(fileName)
        const { error: imgInsertError } = await supabase
          .from('listing_images')
          .insert({ listing_id: listingId, image_url: publicUrl, order_index: startOrder + i })
        if (imgInsertError) throw imgInsertError
        uploaded += 1
        setUploadProgress((prev) => (prev ? { done: prev.done + 1, total: prev.total } : null))
      } catch (imgErr) {
        console.error('image upload failed:', imgErr)
        return { failed: files.slice(i), uploaded }
      }
    }
    return { failed: [], uploaded }
  }

  // Tag the listing's offerings through the server route. Returns true
  // on success; a failure is the caller's to surface, not to swallow.
  const postItemTags = async (listingId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/listings/${listingId}/item-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems.map((s) =>
            s.itemId
              ? { item_id: s.itemId }
              : s.kindId
                ? { kind_id: s.kindId }
                : { kind_name: s.kindName },
          ),
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        console.error('item-tags failed:', data?.error || res.status)
        return false
      }
      return true
    } catch (tagErr) {
      console.error('item-tags failed:', tagErr)
      return false
    }
  }

  // Retry only the photos that failed to upload for the live listing.
  const retryFailedImages = async () => {
    if (!publishedListingId || failedImages.length === 0 || !user) return
    setLoading(true)
    setError('')
    const startOrder = uploadProgress?.done ?? 0
    const { failed } = await uploadImagesSequential(publishedListingId, failedImages, startOrder)
    setFailedImages(failed)
    setLoading(false)
    if (failed.length === 0) {
      setUploadProgress(null)
      router.push(`/listings/${publishedListingId}`)
    } else {
      setError('Todavía no se pudieron subir todas las fotos. Revisa tu conexión e inténtalo de nuevo.')
    }
  }

  // Retry the tag operation that failed for the live listing.
  const retryTags = async () => {
    if (!publishedListingId || !tagWarning) return
    setLoading(true)
    setError('')
    let ok = true
    if (tagWarning === 'business' && taggedBusiness) {
      const { error: tagError } = await supabase.from('listing_business_tags').insert({
        listing_id: publishedListingId,
        business_id: taggedBusiness.id,
      })
      if (tagError) {
        console.error('business-tag retry failed:', tagError.message)
        ok = false
      }
    } else if (tagWarning === 'items' && selectedItems.length > 0) {
      ok = await postItemTags(publishedListingId)
    }
    setLoading(false)
    if (ok) {
      setTagWarning(null)
      router.push(`/listings/${publishedListingId}`)
    } else {
      setError('Todavía no se pudo guardar la etiqueta. Inténtalo de nuevo.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // The listing already exists once published — the form must not
    // re-submit and duplicate it; retries go through the retry buttons.
    if (!user || publishedListingId) return

    const { errors, firstId } = validateForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Revisa los datos marcados del anuncio')
      if (firstId) scrollToField(firstId)
      return
    }
    // Automotive required fields are validated here, before any DB
    // write (P1-7) — not only at the very end of submit.
    if (isAutomotive && (!year || !make.trim() || !model.trim())) {
      const autoErrors: Record<string, string> = {}
      if (!year) autoErrors.year = 'Falta el año'
      if (!make.trim()) autoErrors.make = 'Falta la marca'
      if (!model.trim()) autoErrors.model = 'Falta el modelo'
      setFieldErrors(autoErrors)
      setError('Completa año, marca y modelo del vehículo')
      scrollToField('auto-fields')
      return
    }

    setLoading(true)
    setError('')
    setFieldErrors({})

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
          country_code: gpsCountryCode ?? countryCode,
          city: normalizeTownName(city),
          state_region: stateRegion || null,
          metadata,
          video_url: videoUrl || null,
          tagged_business_id: taggedBusiness?.id || null,
          status: 'active',
        })
        .select()
        .single()

      if (listingError) throw listingError

      // The listing exists now: the draft has done its job.
      clearDraft()
      setPublishedListingId(listing.id)

      // WhatsApp opt-in (P1-6): save the number to the profile when
      // the seller asked for it. Best-effort — a failure here never
      // blocks the publish.
      const digits = whatsappNumber.replace(/\D/g, '')
      if (whatsappOptIn && digits.length >= 10 && !profile?.whatsapp_number) {
        supabase.from('profiles').update({ whatsapp_number: digits }).eq('id', user.id)
          .then(({ error: waError }) => {
            if (waError) console.error('whatsapp save failed:', waError.message)
          })
      }

      // Business tag junction — a failure is surfaced with a retry
      // (P1-4), not swallowed as before.
      let businessTagFailed = false
      if (taggedBusiness) {
        const { error: tagError } = await supabase.from('listing_business_tags').insert({
          listing_id: listing.id,
          business_id: taggedBusiness.id,
        })
        if (tagError) {
          businessTagFailed = true
          console.error('business-tag failed:', tagError.message)
        }
      }

      // Images, one at a time with progress (P0-2). A failure keeps
      // the listing (already live) and offers a retry for the failed
      // photos only — the old rollback that deleted the listing and
      // wiped the form is gone (P0-1).
      let imagesFailed = false
      if (images.length > 0) {
        setUploadProgress({ done: 0, total: images.length })
        const { failed } = await uploadImagesSequential(listing.id, images, 0)
        if (failed.length > 0) {
          imagesFailed = true
          setFailedImages(failed)
        } else {
          setUploadProgress(null)
        }
      }

      // Items engine (§8, 034B): tag the listing's offerings through
      // the server route, which enforces ownership, business
      // consistency and attribution. Best-effort like the business
      // tag above: the listing is already live, and tags are
      // optional — a failure here must not strand the user on the
      // form with a published listing (a retry would duplicate it).
      let itemTagsFailed = false
      if (selectedItems.length > 0) {
        itemTagsFailed = !(await postItemTags(listing.id))
      }

      if (imagesFailed) {
        setError('Tu anuncio ya está publicado, pero no se pudieron subir todas las fotos. Revisa tu conexión y reintenta solo las fotos.')
        setLoading(false)
        return
      }
      if (businessTagFailed || itemTagsFailed) {
        setTagWarning(businessTagFailed ? 'business' : 'items')
        setLoading(false)
        return
      }
      setLoading(false)
      router.push(`/listings/${listing.id}`)
    } catch (err) {
      console.error('publish failed:', err)
      setError(humanizePostError(err))
      setLoading(false)
    }
  }

  const categories = categoriesForType(listingType)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 max-w-2xl">

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
          {draftRestored && (
            <p className="text-xs text-gray-500 mt-2">
              Borrador restaurado · se guarda en este dispositivo.{' '}
              <button type="button" onClick={resetForm} className="underline text-gray-700">
                Descartar
              </button>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-0">

          {/* ══════════════════════════════════════════════
              TYPE — what are you sharing?
              ══════════════════════════════════════════════ */}
          {storeType === 'general' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-5">
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
                      onClick={() => {
                        setListingType(type)
                        // Keep the category when it exists in the new
                        // type's list; only clear when it doesn't apply.
                        setCategory((prev) => (prev && categoriesForType(type).includes(prev) ? prev : ''))
                      }}
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
          </div>
          )}

          {/* ══════════════════════════════════════════════
              PHOTOS — visual first
              ══════════════════════════════════════════════ */}
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
                capture="environment"
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
            {compressing && (
              <p className="text-xs text-gray-500 mt-3">Comprimiendo fotos…</p>
            )}
            {uploadProgress && (
              <div className="mt-3">
                <p className="text-xs text-gray-500">
                  {failedImages.length > 0
                    ? `Fotos subidas: ${uploadProgress.done} de ${uploadProgress.total} · ${failedImages.length} pendiente${failedImages.length === 1 ? '' : 's'}.`
                    : `Subiendo ${Math.min(uploadProgress.done + 1, uploadProgress.total)} de ${uploadProgress.total}…`}
                </p>
                <div className="h-1 bg-gray-200 rounded-full mt-1.5">
                  <div
                    className="h-1 bg-gray-900 rounded-full transition-all"
                    style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════
              CORE DETAILS — title, description, price, category
              ══════════════════════════════════════════════ */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm">
                {listingType === 'news' ? 'Titular' : 'Título'} <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); clearFieldError('title') }}
                required
                maxLength={LISTING_TITLE_MAX}
                placeholder={config.titlePlaceholder}
                className="text-base"
              />
              {fieldErrors.title && <p className="text-xs text-red-500">{fieldErrors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm">
                Descripción <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => { setDescription(e.target.value); clearFieldError('description') }}
                required
                maxLength={LISTING_DESC_MAX}
                placeholder={config.descPlaceholder}
                rows={listingType === 'news' ? 6 : 4}
                className="resize-none"
              />
              {fieldErrors.description && <p className="text-xs text-red-500">{fieldErrors.description}</p>}
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
                    onChange={(e) => { setPrice(e.target.value); clearFieldError('price') }}
                    required={!priceConsultar}
                    disabled={priceConsultar}
                    placeholder={priceConsultar ? 'A consultar' : '0.00'}
                  />
                  {fieldErrors.price && <p className="text-xs text-red-500">{fieldErrors.price}</p>}
                  <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={priceConsultar}
                      onChange={(e) => { setPriceConsultar(e.target.checked); if (e.target.checked) setPrice('') }}
                      className="rounded border-gray-300"
                    />
                    Precio a consultar / Gratis
                  </label>
                </div>
              )}

              {/* Category */}
              {storeType === 'general' ? (
                <div className="space-y-1.5" id="category-field">
                  <Label htmlFor="category" className="text-sm">
                    Categoría <span className="text-red-400">*</span>
                  </Label>
                  <Select value={category} onValueChange={(v) => { setCategory(v); clearFieldError('category') }} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Elige una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {t.categories.find(c => c.value === cat)?.label ?? cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.category && <p className="text-xs text-red-500">{fieldErrors.category}</p>}
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

          {/* ══════════════════════════════════════════════
              LOCATION
              ══════════════════════════════════════════════ */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</p>
            <LocationPicker
              city={city}
              stateRegion={stateRegion}
              country={countryCode}
              onCityChange={setCity}
              onStateRegionChange={setStateRegion}
              onCountryChange={setCountryCode}
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

          {/* ══════════════════════════════════════════════
              WHATSAPP — opt-in at posting time (only when the
              seller has no number on their profile yet)
              ══════════════════════════════════════════════ */}
          {user && profile && !profile.whatsapp_number && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto por WhatsApp</p>
            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                className="rounded border-gray-300 mt-0.5"
              />
              Quiero que los compradores me escriban por WhatsApp
            </label>
            {whatsappOptIn && (
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp" className="text-sm">Tu número de WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  inputMode="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Ej: 665 123 4567"
                />
                <p className="text-[11px] text-gray-400">Se guarda en tu perfil para tus próximos anuncios.</p>
              </div>
            )}
          </div>
          )}

          {/* ══════════════════════════════════════════════
              TYPE-SPECIFIC FIELDS — only when they apply
              ══════════════════════════════════════════════ */}
          {(isRealEstate || isAutomotive) && (
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
              <div id="auto-fields" className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="auto-year" className="text-sm">Año *</Label>
                  <Input id="auto-year" type="number" min="1950" max="2027" value={year} onChange={(e) => { setYear(e.target.value); clearFieldError('year') }} required placeholder="2024" />
                  {fieldErrors.year && <p className="text-xs text-red-500">{fieldErrors.year}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label htmlFor="auto-make" className="text-sm">Marca *</Label><Input id="auto-make" value={make} onChange={(e) => { setMake(e.target.value); clearFieldError('make') }} required placeholder="Toyota" />{fieldErrors.make && <p className="text-xs text-red-500">{fieldErrors.make}</p>}</div>
                  <div className="space-y-1.5"><Label htmlFor="auto-model" className="text-sm">Modelo *</Label><Input id="auto-model" value={model} onChange={(e) => { setModel(e.target.value); clearFieldError('model') }} required placeholder="Tacoma" />{fieldErrors.model && <p className="text-xs text-red-500">{fieldErrors.model}</p>}</div>
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
              </div>
            )}
          </div>
          )}

          {/* ══════════════════════════════════════════════
              EXTRAS (collapsible — reduce overwhelm)
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
                    onChange={(e) => { setVideoUrl(e.target.value); clearFieldError('videoUrl') }}
                    onBlur={() => {
                      if (!videoUrl.trim()) { clearFieldError('videoUrl'); return }
                      try {
                        const host = new URL(videoUrl.trim()).hostname.replace(/^www\./, '')
                        if (!/(youtube\.com|youtu\.be|facebook\.com|fb\.watch|tiktok\.com)$/.test(host)) {
                          setFieldErrors((prev) => ({ ...prev, videoUrl: 'Pega un enlace válido de YouTube, Facebook o TikTok' }))
                        } else {
                          clearFieldError('videoUrl')
                        }
                      } catch {
                        setFieldErrors((prev) => ({ ...prev, videoUrl: 'El enlace de video no es válido' }))
                      }
                    }}
                    placeholder="https://youtube.com/watch?v=... o link de Facebook/TikTok"
                  />
                  {fieldErrors.videoUrl && <p className="text-xs text-red-500">{fieldErrors.videoUrl}</p>}
                  <p className="text-[11px] text-gray-400">
                    Pega un enlace de YouTube, Facebook o TikTok
                  </p>
                </div>

                {/* Business Tag */}
                <BusinessTagPicker
                  value={taggedBusiness}
                  onChange={handleBusinessChange}
                  location={location || undefined}
                  category={category || undefined}
                />

                {/* Item Tag — only after a business is tagged (decision 4).
                    key remounts the picker when the business changes, so
                    its search state never leaks across businesses. */}
                {taggedBusiness && (
                  <ItemTagPicker
                    key={taggedBusiness.id}
                    business={taggedBusiness}
                    listingType={listingType}
                    textForHashtags={`${title} ${description}`}
                    value={selectedItems}
                    onChange={setSelectedItems}
                  />
                )}
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════
              STICKY PUBLISH BAR — the action is always visible
              ══════════════════════════════════════════════ */}
          <div className="sticky bottom-0 z-20 -mx-4 px-4 pt-2 pb-3 mt-6 bg-white/95 backdrop-blur border-t border-gray-200">
            {publishedListingId ? (
              <>
                {tagWarning && (
                  <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800 mb-3">
                    Se publicó, pero no se pudo etiquetar el {tagWarning === 'business' ? 'negocio' : 'producto'}.
                    <button
                      type="button"
                      onClick={retryTags}
                      disabled={loading}
                      className="ml-2 underline font-medium"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
                {failedImages.length > 0 && (
                  <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800 mb-3">
                    Faltan {failedImages.length} foto{failedImages.length === 1 ? '' : 's'} por subir.
                    <button
                      type="button"
                      onClick={retryFailedImages}
                      disabled={loading}
                      className="ml-2 underline font-medium"
                    >
                      Reintentar fotos
                    </button>
                  </div>
                )}
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl mb-3">
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => router.push('/my-listings')} className="h-12 px-5 rounded-xl">
                    Mis anuncios
                  </Button>
                  <Button type="button" onClick={() => router.push(`/listings/${publishedListingId}`)} className="flex-1 h-12 text-base font-medium rounded-xl">
                    Ver mi anuncio
                  </Button>
                </div>
              </>
            ) : (
              <>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl mb-3">
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="h-12 px-5 rounded-xl">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-12 text-base font-medium rounded-xl">
                    {loading
                      ? uploadProgress
                        ? `Subiendo ${uploadProgress.done + 1} de ${uploadProgress.total}…`
                        : 'Publicando...'
                      : 'Publicar'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}
