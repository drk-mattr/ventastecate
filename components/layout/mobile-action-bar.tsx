'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useAuthModal } from '@/lib/auth/auth-modal-context'
import { Home, Search, Plus, MessageCircle, User, UserPlus } from 'lucide-react'

/**
 * Mobile-only sticky bottom navigation with a prominent "Publicar" CTA.
 * Hidden on md+ (desktop uses the header). Gives phones one-tap access to the
 * core actions and keeps posting a listing always reachable.
 */
export function MobileActionBar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { openAuth } = useAuthModal()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const itemClass = (href: string) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] transition-colors ${
      isActive(href) ? 'text-gray-900' : 'text-gray-400'
    }`

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16 bg-white border-t border-gray-200 flex items-stretch px-1 pb-[env(safe-area-inset-bottom)]">
      <Link href="/" className={itemClass('/')} aria-label="Inicio">
        <Home className="h-5 w-5" />
        <span>Inicio</span>
      </Link>
      <Link href="/search" className={itemClass('/search')} aria-label="Buscar">
        <Search className="h-5 w-5" />
        <span>Buscar</span>
      </Link>

      {/* Prominent primary CTA */}
      <Link
        href="/listings/new"
        className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
        aria-label="Publicar anuncio"
      >
        <span className="-mt-5 flex items-center justify-center h-12 w-12 rounded-full bg-orange-600 border border-orange-600 text-white shadow-md">
          <Plus className="h-6 w-6" />
        </span>
        <span className="text-[10px] font-semibold text-orange-700">Publicar</span>
      </Link>

      {user ? (
        <>
          <Link href="/messages" className={itemClass('/messages')} aria-label="Mensajes">
            <MessageCircle className="h-5 w-5" />
            <span>Mensajes</span>
          </Link>
          <Link href="/my-listings" className={itemClass('/my-listings')} aria-label="Mi cuenta">
            <User className="h-5 w-5" />
            <span>Cuenta</span>
          </Link>
        </>
      ) : (
        <>
          <button type="button" onClick={() => openAuth('login')} className={itemClass('/login')} aria-label="Iniciar sesión">
            <User className="h-5 w-5" />
            <span>Entrar</span>
          </button>
          <button type="button" onClick={() => openAuth('signup')} className={itemClass('/signup')} aria-label="Registrarse">
            <UserPlus className="h-5 w-5" />
            <span>Crear</span>
          </button>
        </>
      )}
    </nav>
  )
}
