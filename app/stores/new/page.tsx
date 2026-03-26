'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StoreType } from '@/lib/types/database'
import Image from 'next/image'
import { Store, Home, Car } from 'lucide-react'


export default function NewStorePage() {
  const { user, refreshStores } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useTranslations()
  const f = t.forms

  const STORE_TYPES: { value: StoreType; Icon: React.ComponentType<{ className?: string }>; label: string; description: string }[] = [
    { value: 'general',     Icon: Store, label: f.storeTypeGeneralLabel,     description: f.storeTypeGeneralDesc },
    { value: 'real_estate', Icon: Home,  label: f.storeTypeRealEstateLabel,  description: f.storeTypeRealEstateDesc },
    { value: 'automotive',  Icon: Car,   label: f.storeTypeAutomotiveLabel,  description: f.storeTypeAutomotiveDesc },
  ]

  const [step, setStep] = useState(1)
  const [storeType, setStoreType] = useState<StoreType | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [storeLocation, setStoreLocation] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleNameChange = (value: string) => {
    setName(value)
    const generated = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
    setSlug(generated)
  }

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
    if (!user || !storeType) return

    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3) {
      setError(f.storeSlugHint)
      return
    }

    setLoading(true)
    setError('')

    try {
      let avatarUrl: string | null = null

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}/${slug}/avatar.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('store-avatars')
          .upload(fileName, avatarFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('store-avatars')
          .getPublicUrl(fileName)

        avatarUrl = publicUrl
      }

      const { data: store, error: insertError } = await supabase
        .from('stores')
        .insert({
          owner_id: user.id,
          name,
          slug,
          store_type: storeType,
          description: description || null,
          location: storeLocation || null,
          avatar_url: avatarUrl,
        })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Ya existe una tienda con ese slug. Elige otro.')
        }
        throw insertError
      }

      await refreshStores()
      router.push(`/stores/${store.slug}`)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Error al crear la tienda')
      setLoading(false)
    }
  }

  if (!user) {
    router.push('/login?redirect=/stores/new')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
          <span className={step === 1 ? 'font-semibold text-gray-900' : ''}>{f.step1}</span>
          <span>→</span>
          <span className={step === 2 ? 'font-semibold text-gray-900' : ''}>{f.step2}</span>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{f.storeTypeTitle}</CardTitle>
              <CardDescription>{f.whatWillYouSell}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {STORE_TYPES.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setStoreType(st.value)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition ${
                    storeType === st.value
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <st.Icon className="h-5 w-5 text-gray-600 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{st.label}</p>
                      <p className="text-xs text-gray-500">{st.description}</p>
                    </div>
                  </div>
                </button>
              ))}

              <div className="pt-4">
                <Button
                  onClick={() => storeType && setStep(2)}
                  disabled={!storeType}
                  className="w-full"
                >
                  {f.continue}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{f.createStoreTitle}</CardTitle>
              <CardDescription>
                <span className="flex items-center gap-1">
                  {storeType === 'real_estate' ? <Home className="h-3.5 w-3.5" /> : storeType === 'automotive' ? <Car className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
                  {STORE_TYPES.find(st => st.value === storeType)?.label} — {f.storeDetails}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar */}
                <div className="space-y-2">
                  <Label>{f.storeLogo}</Label>
                  <div className="flex items-center gap-4">
                    <div
                      className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center cursor-pointer hover:opacity-80 transition"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {avatarPreview ? (
                        <Image
                          src={avatarPreview}
                          alt="Logo"
                          fill
                          className="object-cover"
                        />
                      ) : storeType === 'real_estate' ? (
                        <Home className="h-8 w-8 text-gray-400" />
                      ) : storeType === 'automotive' ? (
                        <Car className="h-8 w-8 text-gray-400" />
                      ) : (
                        <Store className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {f.uploadLogo}
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG. Max 2MB.</p>
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
                  <Label htmlFor="name">{f.storeNameLabel}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder={f.storeNamePlaceholder}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">{f.storeUrlLabel}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 shrink-0">ventastecate.com/stores/</span>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      required
                      placeholder="tienda-lupita"
                      className="font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {f.storeSlugHint}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{f.storeDescLabel}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={f.storeDescPlaceholder}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500">
                    {description.length}/500
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">{f.storeLocationLabel}</Label>
                  <Input
                    id="location"
                    value={storeLocation}
                    onChange={(e) => setStoreLocation(e.target.value)}
                    placeholder={f.storeLocationPlaceholder}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    {f.back}
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? f.creating : f.createStoreBtn}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
