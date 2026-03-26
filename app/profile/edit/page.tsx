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
  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useTranslations()
  const f = t.forms

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/profile/edit')
      return
    }

    if (profile) {
      setDisplayName(profile.display_name || '')
      setBio(profile.bio || '')
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
        })
        .eq('id', user.id)

      if (updateError) throw updateError

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
        <div className="container mx-auto px-4 py-8">
          <p>{f.loadingListing}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
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

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
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
      </main>
    </div>
  )
}
