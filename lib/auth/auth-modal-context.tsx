'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { AuthModal } from '@/components/auth/auth-modal'

type Mode = 'login' | 'signup'

interface AuthModalContextValue {
  openAuth: (mode?: Mode) => void
  closeAuth: () => void
}

const AuthModalContext = createContext<AuthModalContextValue>({
  openAuth: () => {},
  closeAuth: () => {},
})

/**
 * Lets any component open the login/signup popup from anywhere
 * (header, mobile drawer, bottom bar) via useAuthModal().openAuth().
 */
export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('login')

  const openAuth = useCallback((m: Mode = 'login') => {
    setMode(m)
    setOpen(true)
  }, [])
  const closeAuth = useCallback(() => setOpen(false), [])

  return (
    <AuthModalContext.Provider value={{ openAuth, closeAuth }}>
      {children}
      <AuthModal open={open} onOpenChange={setOpen} mode={mode} />
    </AuthModalContext.Provider>
  )
}

export const useAuthModal = () => useContext(AuthModalContext)
