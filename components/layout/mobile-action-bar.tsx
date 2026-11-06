'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useAuthModal } from '@/lib/auth/auth-modal-context'
import { useUnreadMessages } from '@/lib/hooks/use-unread-messages'
import { Home, Search, Plus, MessageCircle, Store, User, UserPlus } from 'lucide-react'

/**
 * Mobile-only sticky bottom navigation with a prominent "Publicar" CTA.
 * Hidden on md+ (desktop uses the header). Gives phones one-tap access to the
 * core actions and keeps posting a listing always reachable.
 *
 * Cuenta links to /my-listings (Mis anuncios) — the user's own page.
 * It used to open the black left sidebar, but the hamburger and the header
 * avatar already open that drawer, so the tab was a duplicate. The drawer
 * still holds Editar perfil, settings and the rest of the account links.
 * Mensajes carries an unread count badge like OfferUp's Inbox and the
 * header bell; the count comes from the shared useUnreadMessages hook
 * (same value the header shows on desktop), refreshed on route changes
 * and Realtime message inserts.
 */
export function MobileActionBar() {
  const pathname = usePathname()
  const { user, profile, activeStore } = useAuth()
  const { openAuth } = useAuthModal()
  const unreadMessages = useUnreadMessages()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const itemClass = (href: string) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] transition-colors ${
      isActive(href) ? 'text-gray-900' : 'text-gray-400'
    }`

  return (
    <>
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
            <Link href="/messages" className={`${itemClass('/messages')} relative`} aria-label="Mensajes">
              <span className="relative">
                <MessageCircle className="h-5 w-5" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-gray-900 text-white text-[10px] font-semibold flex items-center justify-center">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </span>
              <span>Mensajes</span>
            </Link>
            {/* Cuenta is the user's avatar, not a generic person icon:
                the avatar moved here from the mobile header so it isn't
                shown three times (header, sidebar identity, tab). It links
                to Mis anuncios — the drawer is one tap away on the
                hamburger for everything else. */}
            <Link href="/my-listings" className={itemClass('/my-listings')} aria-label="Mi cuenta">
              <span className="relative h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium overflow-hidden">
                {activeStore ? (
                  activeStore.avatar_url ? (
                    <Image src={activeStore.avatar_url} alt={activeStore.name} fill className="object-cover" />
                  ) : (
                    <Store className="h-3.5 w-3.5 text-gray-500" />
                  )
                ) : profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
                ) : (
                  profile ? getInitials(profile.display_name) : 'U'
                )}
              </span>
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
    </>
  )
}
