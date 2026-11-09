'use client'

import { useState, useRef, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { firstListingError, LISTING_TITLE_MAX, LISTING_DESC_MAX, MAX_LISTING_IMAGES } from '@/lib/validation'
import { CARD_COLORS, type CardColorId } from '@/lib/listings/card-colors'
import { normalizeTownName, LOCATION_COOKIE, TOWN_REGIONS, townsForLocation } from '@/lib/business-regions'
import { compressImage } from '@/lib/images/compress'
import { suggestCategory } from '@/lib/listings/suggest-category'
import { logPostingFunnel } from '@/lib/listings/posting-funnel'
// Native video (migration 050): TUS resumable upload + client-side
// validation/poster capture. The installed supabase-js does NOT
// expose resumable uploads — tus-upload.ts drives the storage TUS
// endpoint directly (proven live 2026-11-09: 40 MB survived a drop).
import { validateVideoFile, captureVideoPoster, formatVideoDuration, formatVideoSize, VIDEO_MAX_PER_DAY } from '@/lib/video/validate'
import { uploadVideoResumable } from '@/lib/video/tus-upload'
import { humanizePostError } from '@/lib/errors'
import { useListingDraft, draftKeyForUser } from '@/lib/hooks/use-listing-draft'
import Image from 'next/image'
import { BusinessTagPicker } from '@/components/listings/business-tag-picker'
import { ItemTagPicker } from '@/components/listings/item-tag-picker'
import type { SelectedItemTag } from '@/lib/items/types'
import { Business } from '@/lib/types/database'
import {
  ImagePlus, X, Video, ChevronDown, ChevronUp, Check,
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
  { label: 'Comida', Icon: UtensilsCrossed, type: 'product', category: 'Comida', accent: 'text-gray-900', accentBg: 'bg-gray-100', accentBorder: 'border-gray-300' },
  { label: 'Reseña', Icon: Star, type: 'news', category: 'Reseñas y Recomendaciones', accent: 'text-gray-900', accentBg: 'bg-gray-100', accentBorder: 'border-gray-300' },
  { label: 'Empleo', Icon: Briefcase, type: 'news', category: 'Empleos', accent: 'text-gray-900', accentBg: 'bg-gray-100', accentBorder: 'border-gray-300' },
  { label: 'Perdido', Icon: Dog, type: 'news', category: 'Objetos Perdidos', accent: 'text-gray-900', accentBg: 'bg-gray-100', accentBorder: 'border-gray-300' },
  { label: 'Seguridad', Icon: AlertTriangle, type: 'news', category: 'Seguridad Pública', accent: 'text-gray-900', accentBg: 'bg-gray-100', accentBorder: 'border-gray-300' },
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
    descPlaceholder: 'Describe el evento: qué va a pasar, quiénes participan, qué llevar...',
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

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Short date for the Paso 3 review line ("12 nov · 15:00"). Parses
// as local time — this is display-only, never stored.
function formatShortDate(date: string, time: string): string {
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return date
  const base = `${d.getDate()} ${MONTHS_ES[d.getMonth()]}`
  return time ? `${base} · ${time}` : base
}

function NewListingForm() {
  const [listingType, setListingType] = useState<ListingType>('product')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [priceConsultar, setPriceConsultar] = useState(false)
  // Currency (migration 038): MXN default, USD for cars/rent/etc.
  const [currency, setCurrency] = useState<'MXN' | 'USD'>('MXN')
  // Gratis is its own state now — not the same checkbox as consultar.
  const [isFree, setIsFree] = useState(false)
  // Title-card color (migration 039): news/event only, used when the
  // post has no photo. Stored regardless of photos.
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
  // Native video (migration 050, news only): one clip per post.
  // The file never enters the device draft (like photos) — a
  // restored draft asks the reporter to re-pick it, said in the UI.
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [videoSelfFilmed, setVideoSelfFilmed] = useState(false)
  // Clip upload progress in bytes (the image progress is counts —
  // video keeps its own state so the two never mix).
  const [videoProgress, setVideoProgress] = useState<{ loaded: number; total: number } | null>(null)
  const [videoFailed, setVideoFailed] = useState(false)
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
  // 3-step flow (proposal 2026-11-09): 1 type, 2 details, 3 photos /
  // location / publish. All state stays in this component; the steps
  // are pure conditional render below — nothing remounts between steps.
  const [step, setStep] = useState(1)
  // News canvas autosave indicator ("Guardando…" → "Guardado ✓").
  // The draft hook autosaves silently; this only surfaces its state.
  const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  // Funnel counters (migration 048): draft_started fires once, when
  // the seller first reaches Paso 2 with a type chosen.
  const funnelStartedRef = useRef(false)

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
  const videoInputRef = useRef<HTMLInputElement>(null)
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

  // Store users have a fixed type, so they never see Paso 1 — they
  // land on Paso 2. Derived, never synced with an effect: the step
  // state itself stays 1-based and the clamp lives here.
  const effectiveStep = storeType === 'general' ? step : 2
  const totalSteps = storeType === 'general' ? 3 : 2
  const displayStep = storeType === 'general' ? effectiveStep : effectiveStep - 1

  // News canvas word count (computed, no state).
  const wordCount = description.trim() ? description.trim().split(/\s+/).length : 0

  // Paso 3 review line — one line, Eventbrite's preview lesson in
  // miniature: "Evento · Jazz en el CEART · 12 nov".
  const reviewLine = (() => {
    const typeShort = { product: 'Producto', service: 'Servicio', event: 'Evento', news: 'Noticia' }[listingType]
    const parts = [typeShort, title.trim() || 'Sin título']
    if (listingType === 'event' && eventStartDate) parts.push(formatShortDate(eventStartDate, eventStartTime))
    if (showPrice && !priceConsultar && !isFree && price) parts.push(`$${price} ${currency}`)
    if (showPrice && isFree) parts.push('Gratis')
    return parts.join(' · ')
  })()

  // The news body grows as you type (canvas feel). Direct DOM style
  // only — no React state involved.
  const autoGrowDescription = () => {
    const el = descriptionRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 480)}px`
  }

  // ── Device draft (P0-1) ──
  // The draft value is the whole form; the hook debounces the
  // localStorage write. Photos and the video file are excluded
  // (File objects can't serialize) — the text is what a draft
  // saves; a restored draft asks the reporter to re-pick the video.
  const draftValue = {
    listingType, title, description, price, priceConsultar, currency, isFree, cardColor, category,
    location, city, stateRegion, countryCode, videoUrl,
    eventStartDate, eventStartTime, eventEndDate, eventEndTime, eventVenue, eventTicketUrl,
    taggedBusinessId: taggedBusiness?.id ?? null,
    selectedItems,
    propertyType, transactionType, bedrooms, bathrooms, constructionM2,
    lotM2, parkingSpots, make, model, year, mileageKm, transmission,
    fuelType, color, doors, whatsappOptIn, whatsappNumber, showAdvanced,
    // 3-step flow: the step the seller left on, so a returning draft
    // lands where they were (missing → 1, defensively).
    step,
  }
  const restoreDraft = (d: typeof draftValue) => {
    setListingType((d.listingType as ListingType) || 'product')
    setTitle(d.title || '')
    setDescription(d.description || '')
    setPrice(d.price || '')
    setPriceConsultar(!!d.priceConsultar)
    setCurrency((d.currency as 'MXN' | 'USD') || 'MXN')
    setIsFree(!!d.isFree)
    setCardColor((d.cardColor as CardColorId) || 'orange')
    setEventStartDate(d.eventStartDate || '')
    setEventStartTime(d.eventStartTime || '')
    setEventEndDate(d.eventEndDate || '')
    setEventEndTime(d.eventEndTime || '')
    setEventVenue(d.eventVenue || '')
    setEventTicketUrl(d.eventTicketUrl || '')
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
    // Drafts saved before the 3-step flow have no step — land on 1.
    // A step outside 1–3 (corrupt value) also lands on 1.
    setStep(typeof d.step === 'number' && d.step >= 1 && d.step <= 3 ? d.step : 1)
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

  // Prefill from an item view's "Agrega tu foto" link
  // (?negocio=<businessId>&item=<itemId>). Runs once, after the
  // draft decision: a restored draft wins — only what the draft
  // didn't set gets prefilled. The business is set before the item
  // tag, because offerings belong to one business.
  const searchParams = useSearchParams()
  const prefillItemDoneRef = useRef(false)
  useEffect(() => {
    if (!didRestore || prefillItemDoneRef.current) return
    prefillItemDoneRef.current = true
    const negocioId = searchParams.get('negocio')
    const itemId = searchParams.get('item')
    if (!negocioId && !itemId) return
    // What the stored draft already set: the business row fetch in
    // restoreDraft is async, so state may still be null when this
    // runs — read the stored draft instead of trusting state.
    let draftBusinessId: string | null = null
    let draftHasItems = false
    try {
      const key = draftKeyForUser(user?.id)
      const raw = key ? localStorage.getItem(key) : null
      if (raw) {
        const parsed = JSON.parse(raw) as { taggedBusinessId?: unknown; selectedItems?: unknown }
        draftBusinessId =
          typeof parsed.taggedBusinessId === 'string' ? parsed.taggedBusinessId : null
        draftHasItems = Array.isArray(parsed.selectedItems) && parsed.selectedItems.length > 0
      }
    } catch {
      // Unreadable draft — prefill proceeds.
    }
    const applyItem = (businessId: string) => {
      if (!itemId || draftHasItems || selectedItems.length > 0) return
      createClient()
        .from('items')
        .select('id, business_id, kind_id, kind:item_kinds(id, name, slug)')
        .eq('id', itemId)
        .eq('business_id', businessId)
        .eq('status', 'visible')
        .single()
        .then(({ data }) => {
          const row = data as {
            id: string
            kind_id: string
            kind?: { name?: string; slug?: string } | null
          } | null
          if (row?.kind?.name && row?.kind?.slug) {
            setSelectedItems([
              {
                itemId: row.id,
                kindId: row.kind_id,
                kindName: row.kind.name,
                kindSlug: row.kind.slug,
              },
            ])
          }
        })
    }
    if (negocioId && !draftBusinessId && !taggedBusiness) {
      createClient()
        .from('businesses')
        .select('*')
        .eq('id', negocioId)
        .single()
        .then(({ data }) => {
          if (data) {
            setTaggedBusiness(data as Business)
            applyItem((data as Business).id)
          }
        })
    } else if (itemId && (draftBusinessId || taggedBusiness)) {
      applyItem(draftBusinessId ?? taggedBusiness!.id)
    } else if (itemId) {
      // No business anywhere yet: learn it from the item, then set both.
      createClient()
        .from('items')
        .select('id, business_id')
        .eq('id', itemId)
        .eq('status', 'visible')
        .single()
        .then(({ data }) => {
          const row = data as { id: string; business_id: string } | null
          if (!row) return
          createClient()
            .from('businesses')
            .select('*')
            .eq('id', row.business_id)
            .single()
            .then(({ data: biz }) => {
              if (biz) {
                setTaggedBusiness(biz as Business)
                applyItem((biz as Business).id)
              }
            })
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [didRestore])

  // Reset the whole form (used by "Descartar" on a restored draft).
  const resetForm = () => {
    clearDraft()
    setListingType('product')
    setTitle(''); setDescription(''); setPrice(''); setPriceConsultar(false); setCurrency('MXN'); setIsFree(false)
    setCategory(''); setLocation(''); setCity(''); setStateRegion(''); setCountryCode('MX')
    setGpsCountryCode(null); setVideoUrl(''); setTaggedBusiness(null); setSelectedItems([])
    setPropertyType('casa'); setTransactionType('venta'); setBedrooms(''); setBathrooms('')
    setConstructionM2(''); setLotM2(''); setParkingSpots('')
    setMake(''); setModel(''); setYear(''); setMileageKm(''); setTransmission('automatica')
    setFuelType('gasolina'); setColor(''); setDoors('4')
    setWhatsappOptIn(false); setWhatsappNumber('')
    imagePreviews.forEach((u) => URL.revokeObjectURL(u))
    setImages([]); setImagePreviews([])
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoFile(null); setVideoPreviewUrl(null); setVideoDuration(null)
    setVideoSelfFilmed(false); setVideoProgress(null); setVideoFailed(false)
    if (videoInputRef.current) videoInputRef.current.value = ''
    setFieldErrors({}); setError(''); setDraftRestored(false)
    setPublishedListingId(null); setFailedImages([]); setTagWarning(null)
    setUploadProgress(null)
    setStep(1); setDraftSaveState('idle')
    prefillLocationFromRegion()
  }

  // Single-page form validation: returns per-field errors + the id of
  // the first offending field, so submit can scroll to it.
  const validateForm = (): { errors: Record<string, string>; firstId: string | null } => {
    const errors: Record<string, string> = {}
    if (!title.trim()) errors.title = 'Escribe un título'
    // B2: description is required only for news; for product / service /
    // event it is optional, so a blank box no longer blocks the publish.
    if (listingType === 'news' && !description.trim()) errors.description = 'Escribe una descripción'
    if (showPrice && !priceConsultar && !isFree && !price) errors.price = 'Escribe un precio, o marca Precio a consultar / Gratis'
    if (storeType === 'general' && !category) errors.category = 'Elige una categoría'
    // Native video (migration 050): one video per post, and the
    // self-filmed declaration is required for uploads. The file's
    // size / MIME / duration were checked when it was picked.
    if (videoFile && videoUrl.trim()) errors.video = 'Elige un video o pega un enlace, no los dos'
    if (videoFile && !videoSelfFilmed) errors.selfFilmed = 'Confirma que grabaste este video'
    // Events need a date — it is the whole point of the post. Time,
    // end date, venue, and ticket link stay optional.
    if (listingType === 'event') {
      if (!eventStartDate) errors.eventStartDate = 'Ponle fecha a tu evento'
      const startMs = eventStartDate ? new Date(`${eventStartDate}T${eventStartTime || '00:00'}:00`).getTime() : NaN
      const endMs = eventEndDate ? new Date(`${eventEndDate}T${eventEndTime || '00:00'}:00`).getTime() : NaN
      if (eventEndDate && !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs < startMs) {
        errors.eventEndDate = 'El término no puede ser antes del inicio'
      }
      if (eventTicketUrl && !/^https?:\/\//i.test(eventTicketUrl.trim())) {
        errors.eventTicketUrl = 'El enlace debe empezar con https://'
      }
    }
    const firstId = errors.title
      ? 'title'
      : errors.description
        ? 'description'
        : errors.price
          ? 'price'
          : errors.category
            ? 'category-field'
            : errors.eventStartDate
              ? 'event-start-date'
              : errors.eventEndDate
                ? 'event-end-date'
                : errors.eventTicketUrl
                  ? 'event-ticket-url'
                  : errors.video
                    ? 'video-field'
                    : errors.selfFilmed
                      ? 'video-self-filmed'
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

  // ── 3-step navigation ──
  // Steps are conditional render inside this one component — the form
  // never remounts between steps, so focus, scroll position and the
  // compression state all survive. Back never loses data.
  const goToStep = (next: number, funnelType?: ListingType) => {
    setStep(next)
    setFieldErrors({})
    setError('')
    // Funnel counter (migration 048): reaching Paso 2 with a type
    // chosen is a started draft. Fires once per form mount. The
    // caller passes the type just chosen — state hasn't applied yet
    // when a type card is tapped, so the stale value would be logged.
    if (next === 2 && !funnelStartedRef.current) {
      funnelStartedRef.current = true
      logPostingFunnel(supabase, 'draft_started', funnelType ?? listingType)
    }
    window.scrollTo(0, 0)
  }

  // Paso 2 validation: the same checks as validateForm — every field
  // it checks lives on Paso 2 — plus the automotive year/make/model
  // check that submit enforces. Never stricter than submit.
  const validateStep2 = (): { errors: Record<string, string>; firstId: string | null } => {
    const { errors, firstId } = validateForm()
    if (isAutomotive && (!year || !make.trim() || !model.trim())) {
      if (!year) errors.year = 'Falta el año'
      if (!make.trim()) errors.make = 'Falta la marca'
      if (!model.trim()) errors.model = 'Falta el modelo'
      return { errors, firstId: firstId ?? 'auto-fields' }
    }
    return { errors, firstId }
  }

  const handleNextFromStep2 = () => {
    const { errors, firstId } = validateStep2()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Revisa los datos marcados')
      if (firstId) scrollToField(firstId)
      return
    }
    goToStep(3)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addImages(files)
  }

  const addImages = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length + images.length > MAX_LISTING_IMAGES) {
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

  // ── Native video (migration 050, news only) ──
  // Size / MIME / duration are checked on pick, not at submit —
  // a 50 MB clip that fails at publish time is a wasted upload.
  // Picking a clip does NOT clear a pasted link (and vice versa):
  // the submit validation errors with "one or the other" instead
  // of silently discarding what the reporter typed or picked.
  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const check = await validateVideoFile(file)
    if (!check.ok) {
      setFieldErrors((prev) => ({ ...prev, video: check.error }))
      e.target.value = ''
      return
    }
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoFile(file)
    setVideoPreviewUrl(URL.createObjectURL(file))
    setVideoDuration(check.durationSeconds)
    setVideoSelfFilmed(false)
    setVideoFailed(false)
    clearFieldError('video')
  }

  const removeVideo = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoFile(null)
    setVideoPreviewUrl(null)
    setVideoDuration(null)
    setVideoSelfFilmed(false)
    setVideoProgress(null)
    setVideoFailed(false)
    clearFieldError('video')
    clearFieldError('selfFilmed')
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  // Revoke the clip preview URL on unmount (same pattern as the
  // photo previews above).
  const videoPreviewRef = useRef<string | null>(null)
  videoPreviewRef.current = videoPreviewUrl
  useEffect(() => {
    const ref = videoPreviewRef
    return () => {
      if (ref.current) URL.revokeObjectURL(ref.current)
    }
  }, [])

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

  // ── Native video upload (migration 050) ──
  // 5/day cap (proposal §4): count today's video posts by this
  // user. The UTC day boundary is a cap, not a legal boundary.
  // Pre-050 the video_storage_path column does not exist (42703) —
  // fall back to counting links only, so the cap never blocks the
  // publish over a missing column.
  const checkVideoDailyCap = async (): Promise<boolean> => {
    if (!user) return false
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const base = supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString())
    const withNative = await base.or('video_storage_path.not.is.null,video_url.not.is.null')
    if (!withNative.error) return (withNative.count ?? 0) < VIDEO_MAX_PER_DAY
    const linksOnly = await base.not('video_url', 'is', null)
    return (linksOnly.count ?? 0) < VIDEO_MAX_PER_DAY
  }

  // Upload the picked clip for a live listing: poster frame first,
  // then the resumable TUS upload, then link the three columns.
  // Returns true on success. A failure keeps the listing (already
  // live) and offers a retry — same pattern as photos.
  const uploadVideoForListing = async (listingId: string): Promise<boolean> => {
    if (!videoFile || !user) return false
    try {
      setVideoProgress({ loaded: 0, total: videoFile.size })
      const ext = (videoFile.name.split('.').pop() || 'mp4').toLowerCase()
      const objectPath = `${user.id}/${listingId}/${Date.now()}.${ext}`
      // Poster frame: captured on-device, stored with the photos so
      // the feed card and the moderator inbox have a thumbnail.
      let thumbnailUrl: string | null = null
      const posterBlob = await captureVideoPoster(videoFile)
      if (posterBlob) {
        const posterName = `${user.id}/${listingId}/poster-${Date.now()}.jpg`
        const { error: posterError } = await supabase.storage
          .from('listing-images')
          .upload(posterName, posterBlob, { contentType: 'image/jpeg' })
        if (!posterError) {
          thumbnailUrl = supabase.storage.from('listing-images').getPublicUrl(posterName).data.publicUrl
        }
      }
      await uploadVideoResumable({
        supabase,
        objectPath,
        file: videoFile,
        contentType: videoFile.type || 'video/mp4',
        onProgress: (p) => setVideoProgress(p),
      })
      // Link the clip to the listing. Pre-050 the columns do not
      // exist — a 42703 here means the clip is stored but unlinked;
      // the listing stays live, the link is a re-run, not a block.
      const { error: linkError } = await supabase
        .from('listings')
        .update({
          video_storage_path: objectPath,
          video_duration_seconds: videoDuration != null ? Math.round(videoDuration) : null,
          video_thumbnail_url: thumbnailUrl,
        })
        .eq('id', listingId)
      if (linkError) {
        if (linkError.code === '42703' || linkError.code === 'PGRST204') {
          console.error('video link skipped (pre-050):', linkError.message)
        } else {
          throw linkError
        }
      }
      setVideoProgress(null)
      return true
    } catch (err) {
      console.error('video upload failed:', err)
      setVideoProgress(null)
      return false
    }
  }

  // Retry only the video that failed to upload for the live listing.
  const retryVideoUpload = async () => {
    if (!publishedListingId || !videoFile || !user) return
    setLoading(true)
    setError('')
    const ok = await uploadVideoForListing(publishedListingId)
    setLoading(false)
    if (ok) {
      setVideoFailed(false)
      router.push(`/listings/${publishedListingId}`)
    } else {
      setError('Todavía no se pudo subir el video. Revisa tu conexión e inténtalo de nuevo.')
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

    // Video cap (5/day, migration 050) — checked before the insert
    // so a blocked post never creates a listing.
    if (videoFile || videoUrl.trim()) {
      const underCap = await checkVideoDailyCap()
      if (!underCap) {
        setError('Hoy ya publicaste 5 videos. Puedes publicar mañana, o publicar esta noticia sin video.')
        setLoading(false)
        return
      }
    }

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
      const finalPrice = listingType === 'news' ? 0 : (priceConsultar || isFree) ? 0 : (Number.isFinite(parsedPrice) ? parsedPrice : 0)

      // Validate user input before touching the DB.
      const validationError = firstListingError({
        title,
        description,
        price: finalPrice,
        videoUrl: videoUrl || undefined,
        listingType,
        hasVideoUpload: !!videoFile,
        selfFilmed: videoSelfFilmed,
      })
      if (validationError) {
        setError(validationError)
        setLoading(false)
        return
      }

      // Currency + Gratis (migration 038) + title-card color (039) +
      // structured event fields (043): try with the new columns
      // first; pre-migration the columns don't exist, so retry
      // without them (same 42703 fallback PR #86 used for sold_at).
      // The listing itself is the core — the rest are bonuses until
      // applied.
      const toEventIso = (date: string, time: string): string | null => {
        if (!date) return null
        const d = new Date(`${date}T${time || '00:00'}:00`)
        return Number.isNaN(d.getTime()) ? null : d.toISOString()
      }
      const eventInsert = listingType === 'event' ? {
        event_starts_at: toEventIso(eventStartDate, eventStartTime),
        event_ends_at: toEventIso(eventEndDate, eventEndTime),
        event_venue: eventVenue.trim() || null,
        event_ticket_url: eventTicketUrl.trim() || null,
      } : {}
      const insertBase = {
        user_id: user.id,
        store_id: activeStore?.id || null,
        listing_type: listingType,
        title, description: description.trim(),
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
      }
      let { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({ ...insertBase, currency, is_free: isFree, card_color: cardColor, ...eventInsert })
        .select()
        .single()
      if (listingError && (listingError.code === '42703' || listingError.code === 'PGRST204')) {
        const retry = await supabase
          .from('listings')
          .insert(insertBase)
          .select()
          .single()
        listing = retry.data
        listingError = retry.error
      }

      if (listingError) throw listingError

      // The listing exists now: the draft has done its job.
      clearDraft()
      setPublishedListingId(listing.id)
      // Funnel counter (migration 048): the draft completed. Best
      // effort — a missing table never blocks the publish.
      logPostingFunnel(supabase, 'draft_published', listingType)

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

      // Native video (migration 050): upload after the photos, same
      // pattern — the listing is already live, a failure offers a
      // retry for the video only.
      let videoFailedUpload = false
      if (videoFile) {
        const ok = await uploadVideoForListing(listing.id)
        if (!ok) {
          videoFailedUpload = true
          setVideoFailed(true)
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
      if (videoFailedUpload) {
        setError('Tu anuncio ya está publicado, pero no se pudo subir el video. Revisa tu conexión y reintenta solo el video.')
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

  // B3: category suggestion from the title — client-side keyword map,
  // suggestion only, never forced. Shown only while no category is
  // chosen, so it never nags after the user picks one.
  const suggestedCategory = useMemo(
    () => suggestCategory(title, categories),
    [title, categories],
  )

  // ── Paso 2 field blocks ──
  // The step bodies are pure render: every piece of state lives in
  // this component. Field order is the design (proposal §3) — each
  // type composes the SAME blocks in its own order in the Paso 2
  // section below, so the B3 suggestion (title + category on the same
  // step) and every validation message survive the restructure.
  const titleField = (
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
        className="border-gray-300 text-base"
      />
      {fieldErrors.title && <p className="text-xs text-red-500">{fieldErrors.title}</p>}
    </div>
  )

  const descriptionField = (
    <div className="space-y-1.5">
      <Label htmlFor="description" className="text-sm">
        Descripción {listingType === 'news'
          ? <span className="text-red-400">*</span>
          : <span className="text-gray-500 font-normal">(opcional)</span>}
      </Label>
      <Textarea
        id="description"
        ref={descriptionRef}
        value={description}
        onChange={(e) => {
          setDescription(e.target.value); clearFieldError('description')
          // News canvas autosave indicator: the draft hook autosaves
          // silently (debounced 400ms); show the state so the writer
          // trusts the canvas.
          setDraftSaveState('saving')
          if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current)
          draftSaveTimerRef.current = setTimeout(() => setDraftSaveState('saved'), 600)
        }}
        onInput={listingType === 'news' ? autoGrowDescription : undefined}
        onFocus={listingType === 'news' ? autoGrowDescription : undefined}
        required={listingType === 'news'}
        maxLength={LISTING_DESC_MAX}
        placeholder={
          listingType === 'news' && category === 'Objetos Perdidos'
            ? 'Describe lo que se perdió, dónde y cuándo…'
            : listingType === 'news'
              ? '¿Qué pasó? Cuéntalo aquí, o súbelo en video en el siguiente paso.'
              : config.descPlaceholder
        }
        rows={listingType === 'news' ? 8 : 4}
        className={`border-gray-300 resize-none ${listingType === 'news' ? 'leading-relaxed' : ''}`}
      />
      {listingType === 'news' && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">~{wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}</p>
          <p className="text-xs text-gray-500">
            {draftSaveState === 'saving' ? 'Guardando…' : draftSaveState === 'saved' ? 'Guardado ✓' : ''}
          </p>
        </div>
      )}
      {fieldErrors.description && <p className="text-xs text-red-500">{fieldErrors.description}</p>}
    </div>
  )

  const priceField = showPrice ? (
    <div className="space-y-1.5">
      <Label htmlFor="price" className="text-sm">
        Precio {(!priceConsultar && !isFree) && <span className="text-red-400">*</span>}
      </Label>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Input className="border-gray-300"
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => { setPrice(e.target.value); clearFieldError('price') }}
            required={!priceConsultar && !isFree}
            disabled={priceConsultar || isFree}
            placeholder={isFree ? 'Gratis' : priceConsultar ? 'A consultar' : '0.00'}
          />
        </div>
        {/* Currency — MXN default; USD for cars, rent, etc. */}
        <div className="flex shrink-0 rounded-lg border border-gray-300 bg-white p-0.5" role="group" aria-label="Moneda">
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
      {fieldErrors.price && <p className="text-xs text-red-500">{fieldErrors.price}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={priceConsultar}
            onChange={(e) => { setPriceConsultar(e.target.checked); if (e.target.checked) { setPrice(''); setIsFree(false) } }}
            className="rounded border-gray-300"
          />
          Precio a consultar
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isFree}
            onChange={(e) => { setIsFree(e.target.checked); if (e.target.checked) { setPrice(''); setPriceConsultar(false) } }}
            className="rounded border-gray-300"
          />
          Gratis
        </label>
      </div>
    </div>
  ) : null

  const categoryField = storeType === 'general' ? (
    <div className="space-y-1.5" id="category-field">
      <Label htmlFor="category" className="text-sm">
        Categoría <span className="text-red-400">*</span>
      </Label>
      <Select value={category} onValueChange={(v) => { setCategory(v); clearFieldError('category') }} required>
        <SelectTrigger className="border-gray-300">
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
      {/* B3: tappable category suggestion from the title.
          Only while no category is chosen — tap to fill the
          Select, ignore it to pick any other category. */}
      {suggestedCategory && !category && (
        <button
          type="button"
          onClick={() => { setCategory(suggestedCategory); clearFieldError('category') }}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
        >
          ¿{t.categories.find(c => c.value === suggestedCategory)?.label ?? suggestedCategory}?
          <span className="text-gray-500">Sugerencia por tu título</span>
        </button>
      )}
      {fieldErrors.category && <p className="text-xs text-red-500">{fieldErrors.category}</p>}
    </div>
  ) : storeType === 'real_estate' ? (
    <div className="space-y-1.5">
      <Label className="text-sm">Tipo de Operación *</Label>
      <Select value={transactionType} onValueChange={setTransactionType}>
        <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="venta">Venta</SelectItem>
          <SelectItem value="renta">Renta</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ) : null

  // Fecha y lugar — events only (migration 043). The date is what
  // the card and the detail page show; the time is optional, and a
  // date with no time shows as a day only.
  const eventFields = (
    <div className="space-y-4">
      <div>
        <p className="text-base font-semibold text-gray-900">Fecha y lugar</p>
        <p className="text-xs text-gray-500 mt-0.5">
          La fecha se muestra en la tarjeta y en la página del evento. Si no pones hora, solo se muestra el día.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="event-start-date" className="text-sm">
            Fecha de inicio <span className="text-red-400">*</span>
          </Label>
          <Input className="border-gray-300"
            id="event-start-date"
            type="date"
            value={eventStartDate}
            onChange={(e) => { setEventStartDate(e.target.value); clearFieldError('eventStartDate') }}
            required
          />
          {fieldErrors.eventStartDate && <p className="text-xs text-red-500">{fieldErrors.eventStartDate}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="event-start-time" className="text-sm">Hora</Label>
          <Input className="border-gray-300"
            id="event-start-time"
            type="time"
            value={eventStartTime}
            onChange={(e) => setEventStartTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="event-end-date" className="text-sm">Fecha de término</Label>
          <Input className="border-gray-300"
            id="event-end-date"
            type="date"
            value={eventEndDate}
            onChange={(e) => { setEventEndDate(e.target.value); clearFieldError('eventEndDate') }}
          />
          {fieldErrors.eventEndDate && <p className="text-xs text-red-500">{fieldErrors.eventEndDate}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="event-end-time" className="text-sm">Hora</Label>
          <Input className="border-gray-300"
            id="event-end-time"
            type="time"
            value={eventEndTime}
            onChange={(e) => setEventEndTime(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="event-venue" className="text-sm">Lugar / sede</Label>
        <Input className="border-gray-300"
          id="event-venue"
          value={eventVenue}
          onChange={(e) => setEventVenue(e.target.value)}
          maxLength={120}
          placeholder="Ej: Arena Tecate, Unidad Deportiva CREA…"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="event-ticket-url" className="text-sm">Enlace de boletos</Label>
        <Input className="border-gray-300"
          id="event-ticket-url"
          type="url"
          inputMode="url"
          value={eventTicketUrl}
          onChange={(e) => { setEventTicketUrl(e.target.value); clearFieldError('eventTicketUrl') }}
          placeholder="https://…"
        />
        {fieldErrors.eventTicketUrl && <p className="text-xs text-red-500">{fieldErrors.eventTicketUrl}</p>}
      </div>
    </div>
  )

  // Type-specific fields — only when they apply (real estate /
  // automotive categories or typed stores).
  const typeSpecificFields = (isRealEstate || isAutomotive) ? (
    <div className="space-y-5">
      <p className="text-base font-semibold text-gray-900">
        {isRealEstate ? 'Detalles de la propiedad' : 'Detalles del vehículo'}
      </p>
      {isRealEstate && (
        <>
          <div className="space-y-1.5">
            <Label className="text-sm">Tipo de Propiedad *</Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
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
            <div className="space-y-1.5"><Label className="text-sm">Recámaras</Label><Input className="border-gray-300" type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="3" /></div>
            <div className="space-y-1.5"><Label className="text-sm">Baños</Label><Input className="border-gray-300" type="number" min="0" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="2" /></div>
            <div className="space-y-1.5"><Label className="text-sm">Estacionamientos</Label><Input className="border-gray-300" type="number" min="0" value={parkingSpots} onChange={(e) => setParkingSpots(e.target.value)} placeholder="2" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-sm">m² Construidos</Label><Input className="border-gray-300" type="number" min="0" value={constructionM2} onChange={(e) => setConstructionM2(e.target.value)} placeholder="120" /></div>
            <div className="space-y-1.5"><Label className="text-sm">m² Terreno</Label><Input className="border-gray-300" type="number" min="0" value={lotM2} onChange={(e) => setLotM2(e.target.value)} placeholder="200" /></div>
          </div>
        </>
      )}
      {isAutomotive && (
        <div id="auto-fields" className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="auto-year" className="text-sm">Año *</Label>
            <Input className="border-gray-300" id="auto-year" type="number" min="1950" max="2027" value={year} onChange={(e) => { setYear(e.target.value); clearFieldError('year') }} required placeholder="2024" />
            {fieldErrors.year && <p className="text-xs text-red-500">{fieldErrors.year}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label htmlFor="auto-make" className="text-sm">Marca *</Label><Input className="border-gray-300" id="auto-make" value={make} onChange={(e) => { setMake(e.target.value); clearFieldError('make') }} required placeholder="Toyota" />{fieldErrors.make && <p className="text-xs text-red-500">{fieldErrors.make}</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="auto-model" className="text-sm">Modelo *</Label><Input className="border-gray-300" id="auto-model" value={model} onChange={(e) => { setModel(e.target.value); clearFieldError('model') }} required placeholder="Tacoma" />{fieldErrors.model && <p className="text-xs text-red-500">{fieldErrors.model}</p>}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label className="text-sm">Kilómetros</Label><Input className="border-gray-300" type="number" min="0" value={mileageKm} onChange={(e) => setMileageKm(e.target.value)} placeholder="45000" /></div>
            <div className="space-y-1.5">
              <Label className="text-sm">Transmisión</Label>
              <Select value={transmission} onValueChange={setTransmission}>
                <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatica">Automática</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Combustible</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
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
            <div className="space-y-1.5"><Label className="text-sm">Color</Label><Input className="border-gray-300" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Blanco" /></div>
            <div className="space-y-1.5">
              <Label className="text-sm">Puertas</Label>
              <Select value={doors} onValueChange={setDoors}>
                <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
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
  ) : null

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
            <p className="text-sm text-gray-500 mt-0.5">
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

        {/* 3-step progress — "Paso X de 3" + thin bar. Store users
            have a fixed type, so they see 2 steps (details, finish). */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">Paso {displayStep} de {totalSteps}</p>
            <p className="text-xs text-gray-500">
              {displayStep === 1 ? '¿Qué quieres compartir?' : displayStep === 2 ? 'Los datos' : 'Fotos, lugar y publicar'}
            </p>
          </div>
          <div className="h-1 bg-gray-200 rounded-full mt-2">
            <div
              className="h-1 bg-gray-900 rounded-full transition-all"
              style={{ width: `${(displayStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="divide-y divide-gray-200">

          {/* ══════════════════════════════════════════════
              TYPE — what are you sharing?
              ══════════════════════════════════════════════ */}
          {storeType === 'general' && step === 1 && (
          <div className="py-6 first:pt-0 space-y-5">
            <div className="space-y-2.5">
              <p className="text-base font-semibold text-gray-900">
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
                        // The description requirement is type-dependent
                        // (required only for news), so a stale error
                        // from the old type must not linger.
                        clearFieldError('description')
                        // Keep the category when it exists in the new
                        // type's list; only clear when it doesn't apply.
                        setCategory((prev) => (prev && categoriesForType(type).includes(prev) ? prev : ''))
                        // Tapping a type card advances — no separate
                        // Siguiente tap on Paso 1.
                        goToStep(2, type)
                      }}
                      className={`
                        relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all
                        ${isActive
                          ? `${cfg.colorBorder} ${cfg.colorBg}`
                          : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400'
                        }
                      `}
                    >
                      <cfg.Icon className={`h-5 w-5 ${isActive ? cfg.color : 'text-gray-500'}`} />
                      <span className={`text-xs font-medium leading-tight text-center ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                        {cfg.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Quick shortcuts — popular topics */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-gray-500 mr-0.5">Popular:</span>
                {QUICK_SHORTCUTS.map((shortcut) => {
                  const isActive = listingType === shortcut.type && category === shortcut.category
                  return (
                    <button
                      key={shortcut.category}
                      type="button"
                      onClick={() => {
                        setListingType(shortcut.type)
                        clearFieldError('description')
                        setCategory(shortcut.category)
                        // A shortcut sets type + category in one tap
                        // and jumps straight to Paso 2.
                        goToStep(2, shortcut.type)
                      }}
                      className={`
                        inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium
                        border transition-all
                        ${isActive
                          ? `${shortcut.accentBg} ${shortcut.accentBorder} ${shortcut.accent}`
                          : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-400'
                        }
                      `}
                    >
                      <shortcut.Icon className={`h-3 w-3 ${isActive ? shortcut.accent : 'text-gray-500'}`} />
                      {shortcut.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          )}

          {/* ══════════════════════════════════════════════
              PASO 3 — Fotos, lugar y publicar
              (photos first, then card color below)
              ══════════════════════════════════════════════ */}
          {effectiveStep === 3 && (
          <>
          {/* PHOTOS + VIDEO — visual first. The section is "Fotos y
              video" (migration 050): photos as before, then one
              native clip for news, then the link field moved out of
              the collapsed extras. */}
          <div className="py-6 first:pt-0">
            <p className="text-base font-semibold text-gray-900 mb-3">
              Fotos y video {(listingType === 'news' || listingType === 'event') && (
                <span className="text-gray-500 font-normal text-sm">(opcional)</span>
              )}
            </p>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => images.length < MAX_LISTING_IMAGES && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all cursor-pointer
                ${isDragging
                  ? 'border-gray-900 bg-gray-100 scale-[1.01]'
                  : images.length > 0
                    ? 'border-gray-300 bg-gray-50/50'
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
                    <ImagePlus className="h-7 w-7 text-gray-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Agrega fotos
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Arrastra aquí o toca para seleccionar (máx. 10)
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
                    {images.length < MAX_LISTING_IMAGES && (
                      <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition">
                        <ImagePlus className="h-5 w-5 text-gray-500" />
                        <span className="text-[10px] text-gray-500 mt-1">{MAX_LISTING_IMAGES - images.length} más</span>
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

            {/* NATIVE VIDEO — news only (migration 050). One clip per
                post, <=60s / <=50MB, uploaded with the TUS resumable
                path so a dropped connection resumes instead of
                restarting. No `capture` attribute: the picker must
                offer the library, not force the camera (PR #99). */}
            {listingType === 'news' && (
              <div className="mt-5 space-y-2" id="video-field">
                <Label className="text-sm flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-gray-500" />
                  Video <span className="text-gray-500 font-normal">(opcional)</span>
                </Label>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={handleVideoChange}
                  className="hidden"
                />
                {!videoFile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100/50 transition-all px-4 py-6 flex flex-col items-center gap-1"
                    >
                      <Video className="h-6 w-6 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Graba o elige un video</span>
                      <span className="text-xs text-gray-500">Hasta 60 segundos · 50 MB · MP4, MOV o WebM</span>
                    </button>
                    {videoUrl.trim() && (
                      <p className="text-[11px] text-gray-500">
                        Ya pegaste un enlace de video abajo — quítalo para subir un clip en su lugar.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    {videoPreviewUrl && (
                      <video src={videoPreviewUrl} controls playsInline preload="metadata" className="w-full rounded-lg bg-black max-h-64" />
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500 truncate">
                        {videoFile.name}
                        {videoDuration != null && ` · ${formatVideoDuration(videoDuration) ?? ''}`}
                        {` · ${formatVideoSize(videoFile.size)}`}
                      </p>
                      <button type="button" onClick={removeVideo} className="text-xs text-gray-500 underline shrink-0">
                        Quitar
                      </button>
                    </div>
                    {videoProgress && (
                      <div>
                        <p className="text-xs text-gray-500">
                          Subiendo video {Math.round((videoProgress.loaded / videoProgress.total) * 100)}%…
                        </p>
                        <div className="h-1 bg-gray-200 rounded-full mt-1.5">
                          <div
                            className="h-1 bg-gray-900 rounded-full transition-all"
                            style={{ width: `${(videoProgress.loaded / videoProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer select-none" id="video-self-filmed">
                      <input
                        type="checkbox"
                        checked={videoSelfFilmed}
                        onChange={(e) => { setVideoSelfFilmed(e.target.checked); clearFieldError('selfFilmed') }}
                        className="rounded border-gray-300 mt-0.5"
                      />
                      Lo grabé yo mismo
                    </label>
                    {fieldErrors.selfFilmed && <p className="text-xs text-red-500">{fieldErrors.selfFilmed}</p>}
                    <p className="text-[11px] text-gray-500">
                      El video se publica con tu nombre. Si sales del formulario, el video no se guarda en el borrador — lo eliges de nuevo.
                    </p>
                  </div>
                )}
                {fieldErrors.video && <p className="text-xs text-red-500">{fieldErrors.video}</p>}
              </div>
            )}

            {/* VIDEO LINK — moved out of the collapsed extras
                (migration 050): a video that already lives elsewhere
                is the alternative to uploading a clip, never both. */}
            <div className="mt-5 space-y-1.5">
              <Label htmlFor="videoUrl" className="flex items-center gap-1.5 text-sm">
                <Video className="h-3.5 w-3.5 text-gray-500" />
                O pega un enlace de video
              </Label>
              <Input className="border-gray-300"
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
              <p className="text-[11px] text-gray-500">
                YouTube, Facebook o TikTok — en lugar de subir un clip.
              </p>
            </div>
          </div>

          {/* Title-card color — news/event only. The card only renders
              when the post has no photo; the choice is stored anyway. */}
          {(listingType === 'news' || listingType === 'event') && (
            <div className="py-6 first:pt-0">
              <p className="text-base font-semibold text-gray-900 mb-1">Color de la tarjeta</p>
              <p className="text-xs text-gray-500 mb-3">
                Si no agregas foto, tu publicación se muestra como una tarjeta con el título en este color.
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
          </>
          )}

          {/* ══════════════════════════════════════════════
              PASO 2 — Los datos (type-specific — field order is
              the design: product in Marketplace order, event
              date-first, news writing-first)
              ══════════════════════════════════════════════ */}
          {effectiveStep === 2 && (
          <div className="py-6 first:pt-0 space-y-5">
            <p className="text-base font-semibold text-gray-900">Los datos</p>
            {listingType === 'event' ? (
              <>
                {titleField}
                {eventFields}
                {/* Price is kept for events (the current form collects
                    it) even though the proposal's event order omits
                    it — dropping the field would change the submit
                    payload. It sits after the ticket link. */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {priceField}
                  {categoryField}
                </div>
                {descriptionField}
              </>
            ) : listingType === 'news' ? (
              <>
                {titleField}
                {descriptionField}
                {categoryField}
              </>
            ) : (
              <>
                {titleField}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {priceField}
                  {categoryField}
                </div>
                {descriptionField}
                {typeSpecificFields}
              </>
            )}
          </div>
          )}

          {/* ══════════════════════════════════════════════
              LOCATION
              ══════════════════════════════════════════════ */}
          {effectiveStep === 3 && (
          <>
          <div className="py-6 first:pt-0 space-y-4">
            <p className="text-base font-semibold text-gray-900">Ubicación</p>
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
              <Input className="border-gray-300"
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
          <div className="py-6 first:pt-0 space-y-3">
            <p className="text-base font-semibold text-gray-900">Contacto por WhatsApp</p>
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
                <Input className="border-gray-300"
                  id="whatsapp"
                  type="tel"
                  inputMode="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Ej: 665 123 4567"
                />
                <p className="text-[11px] text-gray-500">Se guarda en tu perfil para tus próximos anuncios.</p>
              </div>
            )}
          </div>
          )}
          </>
          )}

          {/* ══════════════════════════════════════════════
              EXTRAS (collapsible — reduce overwhelm)
              ══════════════════════════════════════════════ */}
          {effectiveStep === 3 && (
          <>
          <div className="py-6 first:pt-0">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between py-3.5 hover:bg-gray-100 transition"
            >
              <span className="text-base font-semibold text-gray-900">
                Opciones adicionales
              </span>
              {showAdvanced
                ? <ChevronUp className="h-4 w-4 text-gray-500" />
                : <ChevronDown className="h-4 w-4 text-gray-500" />
              }
            </button>

            {showAdvanced && (
              <div className="pb-2 space-y-5 border-t border-gray-200 pt-4">
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

          {/* Review line — one line, Eventbrite's preview lesson in
              miniature: "Evento · Jazz en el CEART · 12 nov". The
              cheapest possible check against a wrong-type or
              wrong-date mistake before it goes live. */}
          <div className="py-4">
            <p className="text-sm text-gray-700">
              Vas a publicar: <span className="font-medium text-gray-900">{reviewLine}</span>
            </p>
          </div>
          </>
          )}

          {/* ══════════════════════════════════════════════
              STICKY PUBLISH BAR — the action is always visible
              ══════════════════════════════════════════════ */}
          <div className="sticky bottom-0 z-20 -mx-4 px-4 pt-2 pb-3 mt-6 bg-white/95 backdrop-blur border-t border-gray-300">
            {publishedListingId ? (
              <>
                {tagWarning && (
                  <div className="text-sm bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 mb-3">
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
                  <div className="text-sm bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 mb-3">
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
                {videoFailed && (
                  <div className="text-sm bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 mb-3">
                    Falta el video por subir.
                    <button
                      type="button"
                      onClick={retryVideoUpload}
                      disabled={loading}
                      className="ml-2 underline font-medium"
                    >
                      Reintentar video
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
                  {/* Paso 1: type cards advance by tapping — the
                      Siguiente here is only a fallback for anyone
                      who misses that the cards are tappable. */}
                  {effectiveStep === 1 && (
                    <>
                      <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="h-12 px-5 rounded-xl">
                        Cancelar
                      </Button>
                      <Button type="button" onClick={() => goToStep(2)} disabled={loading} className="flex-1 h-12 text-base font-medium rounded-xl">
                        Siguiente
                      </Button>
                    </>
                  )}
                  {/* Paso 2: Atrás returns to the type picker (general
                      users only — store users never see Paso 1);
                      Siguiente validates only this step's fields. */}
                  {effectiveStep === 2 && (
                    <>
                      {storeType === 'general' && (
                        <Button type="button" variant="outline" onClick={() => goToStep(1)} disabled={loading} className="h-12 px-5 rounded-xl">
                          Atrás
                        </Button>
                      )}
                      <Button type="button" onClick={handleNextFromStep2} disabled={loading} className="flex-1 h-12 text-base font-medium rounded-xl">
                        Siguiente
                      </Button>
                    </>
                  )}
                  {/* Paso 3: the publish action, same as before. */}
                  {effectiveStep === 3 && (
                    <>
                      <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="h-12 px-5 rounded-xl">
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={loading} className="flex-1 h-12 text-base font-medium rounded-xl">
                        {loading
                          ? videoProgress
                            ? `Subiendo video ${Math.round((videoProgress.loaded / videoProgress.total) * 100)}%…`
                            : uploadProgress
                              ? `Subiendo ${uploadProgress.done + 1} de ${uploadProgress.total}…`
                              : 'Publicando...'
                          : 'Publicar'}
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}

// useSearchParams needs a Suspense boundary (Next 15): the form
// itself is the inner component, this wrapper is the page.
export default function NewListingPage() {
  return (
    <Suspense>
      <NewListingForm />
    </Suspense>
  )
}
