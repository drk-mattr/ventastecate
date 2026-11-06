'use client'

import { useState, useEffect, useRef } from 'react'
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
import Image from 'next/image'

export default function EditProfilePage() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useTranslations()
  const f = t.forms

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [facebookLinked, setFacebookLinked] = useState(false)
  const [facebookBusy, setFacebookBusy] = useState(false)
  // Step 5: email on/off for new-message notifications (migration
  // 033). Undefined pre-migration reads as enabled — the default
  // is ON, existing users are never silently unsubscribed.
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [emailNotificationsBusy, setEmailNotificationsBusy] = useState(false)
  const [emailNotificationsError, setEmailNotificationsError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login?redirect=/profile/edit')
      return
    }

    supabase.auth.getUserIdentities().then(({ data }) => {
      setFacebookLinked((data?.identities || []).some((i) => i.provider === 'facebook'))
    }).catch(() => {})

    if (profile) {
      setDisplayName(profile.display_name || '')
      setBio(profile.bio || '')
      setWhatsappNumber((profile as { whatsapp_number?: string | null }).whatsapp_number || '')
      setEmailNotifications(profile.email_message_notifications ?? true)
      if (profile.avatar_url) {
        setAvatarPreview(profile.avatar_url)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile])

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

  const handleLinkFacebook = async () => {
    setFacebookBusy(true)
    setError('')
    const { data, error: linkError } = await supabase.auth.linkIdentity({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/profile/edit`, scopes: 'email public_profile' },
    })
    if (linkError) {
      setError(linkError.message)
      setFacebookBusy(false)
    } else if (data?.url) {
      window.location.href = data.url
    }
  }

  const handleUnlinkFacebook = async () => {
    setFacebookBusy(true)
    setError('')
    const { data } = await supabase.auth.getUserIdentities()
    const identity = (data?.identities || []).find((i) => i.provider === 'facebook')
    if (!identity) { setFacebookBusy(false); return }
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity)
    if (unlinkError) setError(unlinkError.message)
    else setFacebookLinked(false)
    setFacebookBusy(false)
  }

  // Step 5: flip the email preference immediately (same
  // client-direct profiles update the rest of this page uses).
  // Optimistic: revert on error. Before migration 033 is applied,
  // the column does not exist yet — say so plainly instead of
  // silently leaving the switch in the wrong state.
  const handleToggleEmailNotifications = async () => {
    if (!user || emailNotificationsBusy) return
    const next = !emailNotifications
    setEmailNotifications(next)
    setEmailNotificationsError('')
    setEmailNotificationsBusy(true)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ email_message_notifications: next })
      .eq('id', user.id)
    if (updateError) {
      setEmailNotifications(!next)
      if (String(updateError.message || '').includes('email_message_notifications')) {
        setEmailNotificationsError('No se pudo guardar todavía: falta aplicar la migración 033_message_email_preference.sql en Supabase.')
      } else {
        setEmailNotificationsError(updateError.message || 'Error al guardar la preferencia')
      }
    } else {
      await refreshProfile()
    }
    setEmailNotificationsBusy(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      let avatarUrl = profile?.avatar_url || null

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}/avatar.${fileExt}`

        if (profile?.avatar_url) {
          const oldPath = profile.avatar_url.split('/avatars/')[1]
          if (oldPath) {
            await supabase.storage.from('avatars').remove([oldPath])
          }
        }

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        avatarUrl = publicUrl
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          bio: bio,
          avatar_url: avatarUrl,
          whatsapp_number: whatsappNumber.replace(/\D/g, '') || null,
        })
        .eq('id', user.id)

      if (updateError) {
        // Before migration 019 is applied, the column does not exist yet.
        // Retry without it so name/bio/avatar still save, and say so
        // plainly instead of silently dropping the WhatsApp number.
        if (String(updateError.message || '').includes('whatsapp_number')) {
          const { error: retryError } = await supabase
            .from('profiles')
            .update({ display_name: displayName, bio: bio, avatar_url: avatarUrl })
            .eq('id', user.id)
          if (retryError) throw retryError
          throw new Error('Perfil guardado, pero tu número de WhatsApp no se guardó todavía: falta aplicar la migración 019_whatsapp.sql en Supabase.')
        }
        throw updateError
      }

      setSuccess(true)
      await refreshProfile()
      setLoading(false)

      setTimeout(() => {
        router.push(`/users/${profile?.username}`)
      }, 1500)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Error al actualizar el perfil')
      setLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-6">
          <p>{f.loadingListing}</p>
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
            <CardTitle>{f.editProfile}</CardTitle>
            <CardDescription>{f.updatePersonalInfo}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>{f.profilePhoto}</Label>
                <div className="flex items-center gap-4">
                  <div
                    className="relative h-20 w-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center cursor-pointer hover:opacity-80 transition"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
                        alt="Avatar"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-semibold text-gray-500">
                        {profile.display_name[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {f.changePhoto}
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
                <Label htmlFor="username">{f.usernameLabel}</Label>
                <Input
                  id="username"
                  value={profile.username}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500">
                  {f.usernameCannotChange}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">{f.displayNameLabel}</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder={profile.display_name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">{f.bioLabel}</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={f.bioPlaceholder}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">
                  {bio.length}/500
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
                <Input
                  id="whatsapp"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Ej: 526641234567"
                />
                <p className="text-xs text-gray-500">
                  Solo si quieres que los compradores te escriban por WhatsApp desde tus anuncios. Si lo dejas vacío, no aparece ningún botón ni número. Escribe tu número con código de país, sin espacios ni signos.
                </p>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm text-gray-900 bg-gray-100 p-3 rounded">
                  {f.profileUpdated}
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
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Notificaciones por correo</CardTitle>
            <CardDescription>Recibe un correo cuando alguien te escribe un mensaje. Solo afecta los correos — las notificaciones dentro del sitio (la campana) siguen funcionando igual.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                {emailNotifications ? 'Activadas: te avisamos por correo de cada mensaje nuevo.' : 'Desactivadas: no recibirás correos por mensajes nuevos.'}
              </p>
              <button
                type="button"
                role="switch"
                aria-checked={emailNotifications}
                aria-label="Notificaciones por correo"
                disabled={emailNotificationsBusy}
                onClick={handleToggleEmailNotifications}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${emailNotifications ? 'bg-gray-900' : 'bg-gray-300'}`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${emailNotifications ? 'left-[22px]' : 'left-0.5'}`}
                />
              </button>
            </div>
            {emailNotificationsError && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded mt-4">
                {emailNotificationsError}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Facebook</CardTitle>
            <CardDescription>Entra más rápido con la cuenta de Facebook que ya usas. Puedes vincularla o desvincularla cuando quieras; tu correo sigue funcionando.</CardDescription>
          </CardHeader>
          <CardContent>
            {facebookLinked ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">Tu cuenta de Facebook está vinculada.</p>
                <Button type="button" variant="outline" onClick={handleUnlinkFacebook} disabled={facebookBusy} className="rounded-xl">Desvincular Facebook</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">Aún no has vinculado Facebook.</p>
                <Button type="button" variant="outline" onClick={handleLinkFacebook} disabled={facebookBusy} className="rounded-xl">Vincular Facebook</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
