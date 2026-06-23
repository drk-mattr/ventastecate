'use client'

import { Card, CardContent } from '@/components/ui/card'
import { AuthForm } from '@/components/auth/auth-form'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <AuthForm initialMode="signup" />
        </CardContent>
      </Card>
    </div>
  )
}
