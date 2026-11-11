'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useAuthModal } from '@/lib/auth/auth-modal-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { HeaderSearch } from '@/components/search/header-search'
import { GaritaHeaderChip } from '@/components/border/garita-header-chip'
import { BorderReportDialog } from '@/components/border/border-report-sheet'
import { isPortOpen } from '@/lib/border/estimate'
import { NotificationBell } from '@/components/layout/notification-bell'
import { SidePanel } from '@/components/layout/side-panel'
import { Store, Menu, Tag } from 'lucide-react'

export function Header() {
  const { user, profile, activeStore, loading } = useAuth()
  const { openAuth } = useAuthModal()
  const pathname = usePathname()
  // Business views have their own way to find things (the index's own
  // search on /businesses, the gallery and info on a business page),
  // so the header search is noise there — hide it on /businesses and
  // /businesses/*, and nowhere else.
  const hideHeaderSearch =
    pathname === '/businesses' || (pathname?.startsWith('/businesses/') ?? false)
  const t = useTranslations()
  const [menuOpen, setMenuOpen] = useState(false)
  // The avatar opens the same black panel from the RIGHT on desktop
  // (the old avatar dropdown is gone — 2026-11-10). The hamburger
  // opens it from the left on mobile; the two triggers live in
  // opposite ranges, so only one panel can ever open.
  // The Garita report dialog mounts once here (Header renders
  // both the chip and the sidebar, the two reporting entries).
  // Guests get the auth modal first — the same guard the old
  // sheet's openSheet had. portOpen is computed client-side on
  // mount (the API route doesn't enforce hours; the gate was
  // always UI-only).
  const [reportOpen, setReportOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [portOpen, setPortOpen] = useState(true)
  const openBorderReport = () => {
    if (!user) {
      openAuth('login')
      return
    }
    // Port hours at the moment the dialog opens (the API route
    // doesn't enforce hours; the gate was always UI-only).
    setPortOpen(isPortOpen(new Date()))
    setReportOpen(true)
  }
  // (Store surfacing lives in the side panel now — the header no
  // longer renders a store list of its own.)

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
      {/* Mobile is two rows: logo + actions on top, search full-width
          below. One row on mobile squeezed the search input to a few
          characters wide (the 2026-11-04 screenshot showed just "B").
          Desktop keeps the single row. */}
      <div className="container mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-x-3">
        <div className="order-1 flex items-center gap-2 shrink-0">
          {/* Mobile: hamburger opens the black left sidebar (Muse-app
              style) — the same drawer the avatar and the bottom-bar
              Cuenta tab open. Desktop has no hamburger. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menú"
            className="md:hidden h-9 w-9 -ml-2 flex items-center justify-center text-gray-700"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Logo matches the sidebar's presence: text-2xl on desktop,
              text-xl on mobile (the sidebar's text-2xl would crowd the
              mobile row with the hamburger, location and bell). */}
          <Link href="/" className="text-xl sm:text-2xl font-forum font-bold lowercase">
            ventastecate.com
          </Link>
          <Link href="/businesses" className="hidden lg:inline-flex text-sm font-medium text-gray-700 hover:text-gray-900">
            Negocios
          </Link>
        </div>

        {/* Search lives in the nav bar on every page except business
            views, including the homepage — the old big hero search was
            removed 2026-11-04. The Garita chip rides in this same
            cluster, immediately right of the search bar (desktop
            only), so it hides together with the search on business
            views — business pages keep their clean header, and the
            avatar drawer still links Garita there. */}
        {!hideHeaderSearch && (
          <div className="order-3 sm:order-2 basis-full sm:basis-0 flex-1 min-w-0 mt-2 sm:mt-0 flex items-center gap-3">
            <Suspense fallback={<div className="flex-1 max-w-2xl mx-4" />}>
              <HeaderSearch />
            </Suspense>
            <GaritaHeaderChip onReport={openBorderReport} />
          </div>
        )}

        <div className="order-2 sm:order-3 flex items-center gap-2 shrink-0">
          {loading ? null : user ? (
            <>
              {/* Publish CTA — same orange pill as the homepage, not an outline button,
                  so the primary action reads the same everywhere. */}
              <Button asChild size="sm" className="hidden md:inline-flex h-8 px-4 text-xs font-semibold rounded-full bg-orange-600 hover:bg-orange-700 text-white">
                <Link href="/listings/new">{t.nav.publish}</Link>
              </Button>
              {/* Quick-access icons (desktop; mobile uses the bottom action bar).
                  The bell is activity notifications only now (see
                  NotificationBell) — threads live in the avatar menu
                  below and in the mobile bottom-bar Mensajes tab. */}
              <Button asChild variant="ghost" size="icon" className="hidden lg:inline-flex h-8 w-8 text-gray-600 hover:text-gray-900" aria-label={t.nav.myListings} title={t.nav.myListings}>
                <Link href="/my-listings"><Tag className="h-[18px] w-[18px]" /></Link>
              </Button>
              <NotificationBell />
              {activeStore && (
                <span className="text-[10px] text-gray-500 hidden xl:flex items-center gap-0.5 max-w-[100px] truncate" title={activeStore.name}>
                  <Store className="h-3 w-3 shrink-0" />{activeStore.name}
                </span>
              )}
              {/* Mobile avatar removed 2026-11-05: the avatar now lives in
                  the bottom-bar Cuenta tab instead, so it isn't shown
                  three times (header, sidebar identity, tab). The
                  hamburger opens the left panel; the desktop avatar
                  below opens the same panel from the right — and
                  toggles it: a second tap closes it again (the panel
                  has no backdrop on desktop, so the avatar is one of
                  its two ways shut). */}
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-label="Mi cuenta"
                className="hidden md:inline-flex h-8 w-8 rounded-full p-0"
              >
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
                      <Store className="h-4 w-4 text-gray-500" />
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
              </button>
            </>
          ) : (
            <>
              {/* Desktop: inline auth buttons — open the popup over the current page */}
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openAuth('login')} className="h-8 px-3 text-xs text-gray-600 hover:text-gray-900">
                  {t.nav.login}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openAuth('signup')} className="h-8 px-4 text-xs rounded-full">
                  {t.nav.register}
                </Button>
              </div>

              {/* Mobile menu lives in the header hamburger (left of the
                  logo) — one sidebar for logged-in and logged-out. */}
            </>
          )}
        </div>
      </div>
      {/* One shared panel, two sides: hamburger opens it from the
          left on mobile, the avatar from the right on desktop. */}
      <SidePanel open={menuOpen} onClose={() => setMenuOpen(false)} onReport={openBorderReport} side="left" />
      <SidePanel open={accountOpen} onClose={() => setAccountOpen(false)} onReport={openBorderReport} side="right" />
      <BorderReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        portOpen={portOpen}
      />
    </header>
  )
}
