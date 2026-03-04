'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const t = useTranslations()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Check if terms are accepted
    if (!acceptedTerms) {
      setError('Debes aceptar los Términos de Servicio y la Política de Privacidad para continuar')
      setLoading(false)
      return
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('El nombre de usuario debe tener entre 3-20 caracteres y solo puede contener letras, números y guiones bajos')
      setLoading(false)
      return
    }

    // Check if username is already taken
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existingProfile) {
      setError('Este nombre de usuario ya está en uso')
      setLoading(false)
      return
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          username,
          display_name: displayName,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else {
      // Notify Discord about new registration (fire-and-forget)
      fetch('/api/discord-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName, email }),
      }).catch(() => {/* non-critical, ignore errors */})

      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t.auth.createAccount}</CardTitle>
          <CardDescription>{t.auth.joinTagline}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">{t.auth.username}</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                required
                placeholder="usuario123"
                pattern="[a-zA-Z0-9_]{3,20}"
                title="3-20 caracteres, solo letras, números y guiones bajos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">{t.auth.displayName}</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Tu Nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500">{t.auth.passwordHint}</p>
            </div>
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
                required
              />
              <label htmlFor="terms" className="text-xs text-gray-600">
                {t.auth.iAccept}{' '}
                <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">
                  {t.auth.termsOfService}
                </Link>
                {' '}{t.auth.and}{' '}
                <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                  {t.auth.privacyPolicy}
                </Link>
              </label>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded space-y-2">
                <p className="font-semibold">{t.auth.accountCreated}</p>
                <p>{t.auth.checkEmailHint}</p>
                <p className="text-xs">{t.auth.spamHint}</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading || success}>
              {loading ? t.auth.creating : success ? t.auth.checkEmail : t.auth.createAccount}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {t.auth.alreadyHaveAccount}{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              {t.auth.signInLink}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
