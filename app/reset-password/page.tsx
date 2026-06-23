'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  // Link couldn't establish a recovery session (expired, already used, or opened
  // on a different device than the one that requested the reset).
  const [linkInvalid, setLinkInvalid] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let resolved = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    const markReady = () => {
      resolved = true
      setSessionReady(true)
    }

    // The browser client auto-exchanges the code/hash token from the recovery
    // link (detectSessionInUrl) and fires this event once the session exists.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        markReady()
      }
    })

    const init = async () => {
      // If Supabase bounced back with an error in the URL, surface it.
      const params = new URLSearchParams(
        window.location.search + window.location.hash.replace('#', '&')
      )
      if (params.get('error') || params.get('error_description')) {
        resolved = true
        setLinkInvalid(true)
        return
      }

      // Catch the case where the exchange already happened before we subscribed.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) markReady()

      // Fallback: if no session materialises, the link is bad — stop spinning
      // instead of leaving the user on "Verificando enlace..." forever.
      timeout = setTimeout(() => {
        if (!resolved) setLinkInvalid(true)
      }, 7000)
    }
    init()

    return () => {
      subscription.unsubscribe()
      if (timeout) clearTimeout(timeout)
    }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 2000)
    }
  }

  // Invalid / expired link — give the user a way forward instead of a dead spinner.
  if (linkInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enlace no válido</CardTitle>
            <CardDescription>
              Este enlace para restablecer la contraseña expiró o ya fue utilizado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Solicita un nuevo enlace para continuar.
            </p>
            <Button asChild className="w-full">
              <Link href="/forgot-password">Solicitar nuevo enlace</Link>
            </Button>
            <div className="text-center text-sm">
              <Link href="/login" className="text-blue-600 hover:underline">
                Volver a Iniciar Sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-gray-500">Verificando enlace...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nueva Contraseña</CardTitle>
          <CardDescription>Ingresa tu nueva contraseña</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="text-sm text-green-600 bg-green-50 p-4 rounded">
                <p className="font-medium">¡Contraseña actualizada!</p>
                <p>Redirigiendo...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Repite tu contraseña"
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Contraseña'}
              </Button>
              <div className="text-center text-sm">
                <Link href="/login" className="text-blue-600 hover:underline">
                  Volver a Iniciar Sesión
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
