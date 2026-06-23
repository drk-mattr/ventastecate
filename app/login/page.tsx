'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Card, CardContent } from '@/components/ui/card'
import { AuthForm } from '@/components/auth/auth-form'

function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <AuthForm initialMode="login" redirect={redirect} />
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  const t = useTranslations()
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p>{t.auth.loading}</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
