'use client'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AuthForm } from '@/components/auth/auth-form'

export function AuthModal({
  open,
  onOpenChange,
  mode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'login' | 'signup'
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </DialogTitle>
        <AuthForm initialMode={mode} onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
