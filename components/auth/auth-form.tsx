'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function generateUsername(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 15) || 'user'
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `${base}_${suffix}`
}

type Mode = 'login' | 'signup'

interface AuthFormProps {
  initialMode?: Mode
  /** Where to go after a successful login (page usage). Ignored when onSuccess is set. */
  redirect?: string
  /** Called after a successful login — e.g. close the modal. If omitted, navigates to `redirect`. */
  onSuccess?: () => void
}

/**
 * Shared email/password auth form used by both the /login + /signup pages and
 * the popup modal. Toggles between login and signup in place (no navigation).
 */
export function AuthForm({ initialMode = 'login', redirect = '/', onSuccess }: AuthFormProps) {
  const t = useTranslations()
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false)
  const [success, setSuccess] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setIsDuplicateEmail(false)
    setSuccess(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message.includes('Email not confirmed') ? t.auth.emailNotConfirmed : error.message)
      setLoading(false)
    } else if (onSuccess) {
      onSuccess()
      router.refresh()
    } else {
      router.push(redirect)
      router.refresh()
    }
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

    let username = generateUsername(displayName)
    const { data: existing } = await supabase.from('profiles').select('username').eq('username', username).single()
    if (existing) username = generateUsername(displayName)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // After the user clicks the confirmation email, route through the
        // callback (which exchanges the code + sets the session) and land them
        // on Home already logged in — not stranded on /login.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
        data: { username, display_name: displayName },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else if (signUpData.user?.identities?.length === 0) {
      setError(t.auth.emailAlreadyRegistered)
      setIsDuplicateEmail(true)
      setLoading(false)
    } else {
      fetch('/api/discord-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName, email }),
      }).catch(() => {})
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">
        {mode === 'login' ? t.auth.loginTitle : t.auth.createAccount}
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        {mode === 'login' ? t.auth.loginWelcome : t.auth.joinTagline}
      </p>

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-email">{t.auth.email}</Label>
            <Input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="auth-password">{t.auth.password}</Label>
              <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">{t.auth.forgotPassword}</Link>
            </div>
            <Input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.auth.loggingIn : t.auth.loginTitle}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-email">{t.auth.email}</Label>
            <Input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-name">{t.auth.displayName}</Label>
            <Input id="auth-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required placeholder="Lady Tsunade" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password">{t.auth.password}</Label>
            <Input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="••••••••" />
            <p className="text-xs text-gray-500">{t.auth.passwordHint}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-confirm">{t.auth.confirmPassword}</Label>
            <Input id="auth-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} placeholder="••••••••" />
          </div>
          <div className="flex items-start space-x-2">
            <input type="checkbox" id="auth-terms" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300" required />
            <label htmlFor="auth-terms" className="text-xs text-gray-600">
              {t.auth.iAccept}{' '}
              <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">{t.auth.termsOfService}</Link>
              {' '}{t.auth.and}{' '}
              <Link href="/privacy" target="_blank" className="text-blue-600 hover:underline">{t.auth.privacyPolicy}</Link>
            </label>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded space-y-1">
              <p>{error}</p>
              {isDuplicateEmail && (
                <p className="text-xs">
                  <button type="button" onClick={() => switchMode('login')} className="underline hover:no-underline">{t.auth.loginTitle}</button>
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
      )}

      <div className="mt-4 text-center text-sm">
        {mode === 'login' ? (
          <>{t.auth.noAccount}{' '}<button type="button" onClick={() => switchMode('signup')} className="text-blue-600 hover:underline">{t.auth.signUpLink}</button></>
        ) : (
          <>{t.auth.alreadyHaveAccount}{' '}<button type="button" onClick={() => switchMode('login')} className="text-blue-600 hover:underline">{t.auth.signInLink}</button></>
        )}
      </div>
    </div>
  )
}
