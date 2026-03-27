'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'


function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function generateUsername(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 15) || 'user'
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `${base}_${suffix}`
}

export default function SignupPage() {
  const t = useTranslations()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleGoogleSignup = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setIsDuplicateEmail(false)

    if (!acceptedTerms) {
      setError('Debes aceptar los Términos de Servicio y la Política de Privacidad para continuar')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError(t.auth.passwordMismatch)
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError(t.auth.passwordHint)
      setLoading(false)
      return
    }

    // Auto-generate a unique username from display name
    let username = generateUsername(displayName)
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()
    if (existing) {
      username = generateUsername(displayName) // retry with new random suffix
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
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
    } else if (signUpData.user?.identities?.length === 0) {
      // Supabase silently "succeeds" for duplicate emails when confirmation is on.
      // An empty identities array means the email is already registered.
      setError(t.auth.emailAlreadyRegistered)
      setIsDuplicateEmail(true)
      setLoading(false)
    } else {
      fetch('/api/discord-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName, email }),
      }).catch(() => {/* non-critical */})

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
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center gap-2"
            onClick={handleGoogleSignup}
          >
            <GoogleIcon />
            {t.auth.continueWithGoogle}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">{t.auth.orContinueWith}</span>
            </div>
          </div>

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
              <Label htmlFor="displayName">{t.auth.displayName}</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="Lady Tsunade"
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
                minLength={8}
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500">{t.auth.passwordHint}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
              />
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
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded space-y-1">
                <p>{error}</p>
                {isDuplicateEmail && (
                  <p className="text-xs flex gap-3">
                    <Link href="/login" className="underline hover:no-underline">{t.auth.loginTitle}</Link>
                    <Link href="/forgot-password" className="underline hover:no-underline">{t.auth.forgotPassword}</Link>
                  </p>
                )}
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
