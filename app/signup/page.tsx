'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from '@/lib/hooks/use-translations'
import { safeRedirect } from '@/lib/auth/redirect'
import { Card, CardContent } from '@/components/ui/card'
import { AuthForm } from '@/components/auth/auth-form'

function SignupForm() {
  const searchParams = useSearchParams()
  // Same destination plumbing as /login: a guest sent here from the
  // posting form must land back on their draft after confirming
  // their email, not on Home. Validated as an internal path only.
  const redirect = safeRedirect(searchParams.get('redirect'))
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <AuthForm initialMode="signup" redirect={redirect} />
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  const t = useTranslations()
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p>{t.auth.loading}</p>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
