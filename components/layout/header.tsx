'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useBrand } from '@/lib/brand-context'
import { Button } from '@/components/ui/button'
import { HeaderSearch } from '@/components/search/header-search'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Check, Bug } from 'lucide-react'

export function Header() {
  const { user, profile, stores, activeStore, setActiveStore, signOut } = useAuth()
  const pathname = usePathname()
  const brandName = useBrand()
  const isHomePage = pathname === '/'

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="text-lg font-semibold">
            {brandName}
          </Link>
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Inicio
            </Link>
            {user && (
              <>
                <Link href="/my-listings" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Mis Anuncios
                </Link>
                <Link href="/messages" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Mensajes
                </Link>
              </>
            )}
          </nav>
        </div>

        {!isHomePage && (
          <Suspense fallback={<div className="flex-1 max-w-2xl mx-4" />}>
            <HeaderSearch />
          </Suspense>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <Button asChild size="sm" className="h-8 px-3 text-xs">
                <Link href="/listings/new">Publicar</Link>
              </Button>
              {activeStore && (
                <span className="text-[10px] text-gray-500 hidden sm:block max-w-[100px] truncate" title={activeStore.name}>
                  🏪 {activeStore.name}
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                    <div className="relative h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium overflow-hidden">
                      {activeStore ? (
                        activeStore.avatar_url ? (
                          <Image
                            src={activeStore.avatar_url}
                            alt={activeStore.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-sm">🏪</span>
                        )
                      ) : profile?.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={profile.display_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        profile ? getInitials(profile.display_name) : 'U'
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium">
                      {activeStore ? activeStore.name : profile?.display_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activeStore ? `🏪 Modo tienda` : `@${profile?.username}`}
                    </p>
                  </div>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild className="text-xs">
                    <Link href={`/users/${profile?.username}`}>Mi Perfil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-xs">
                    <Link href="/my-listings">Mis Anuncios</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-xs">
                    <Link href="/messages">Mensajes</Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase text-gray-400 font-medium">
                    Mis Tiendas
                  </DropdownMenuLabel>
                  {stores.length > 0 && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setActiveStore(null)}
                        className="text-xs flex items-center justify-between"
                      >
                        <span>👤 Publicar como yo</span>
                        {!activeStore && <Check className="h-3 w-3" />}
                      </DropdownMenuItem>
                      {stores.map((store) => (
                        <div key={store.id} className="flex items-center">
                          <DropdownMenuItem
                            onClick={() => setActiveStore(store)}
                            className="text-xs flex-1 flex items-center justify-between"
                          >
                            <Link href={`/stores/${store.slug}`} onClick={(e) => e.stopPropagation()} className="truncate hover:underline">
                              🏪 {store.name}
                            </Link>
                            {activeStore?.id === store.id && <Check className="h-3 w-3 shrink-0" />}
                          </DropdownMenuItem>
                        </div>
                      ))}
                    </>
                  )}
                  <DropdownMenuItem asChild className="text-xs">
                    <Link href="/stores/new">+ Crear Tienda</Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="text-xs">
                    <Link href="/profile/edit">Configuración</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-xs">
                    <Link href="/report" className="flex items-center gap-1.5">
                      <Bug className="h-3 w-3" />
                      Reportar problema
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()} className="text-xs">
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="h-8 px-3 text-xs">
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
              <Button size="sm" asChild className="h-8 px-3 text-xs">
                <Link href="/signup">Registrarse</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
