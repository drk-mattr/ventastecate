'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { useTranslations } from '@/lib/hooks/use-translations'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Store, Check } from 'lucide-react'

export default function MyStoresPage() {
  const { user, stores, activeStore, setActiveStore, loading, recentStoreIds } = useAuth()
  const t = useTranslations()
  const router = useRouter()

  const recentRank = (id: string) => {
    const i = recentStoreIds.indexOf(id)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  const sortedStores = [...stores].sort((a, b) => {
    if (activeStore) {
      if (a.id === activeStore.id) return -1
      if (b.id === activeStore.id) return 1
    }
    return recentRank(a.id) - recentRank(b.id)
  })

  useEffect(() => {
    if (!loading && !user) router.replace('/login?redirect=/my-stores')
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-10">
          <p className="text-sm text-gray-500">{t.auth.loading}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold">{t.nav.myStores}</h1>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/stores/new">{t.nav.createStore}</Link>
          </Button>
        </div>

        {stores.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <Store className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-4">{t.nav.noStoresYet}</p>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/stores/new">{t.nav.createStore}</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {sortedStores.map((store) => (
              <li key={store.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white">
                <span className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                  {store.avatar_url ? (
                    <Image src={store.avatar_url} alt={store.name} width={40} height={40} className="h-10 w-10 object-cover" />
                  ) : (
                    <Store className="h-5 w-5 text-gray-500" />
                  )}
                </span>
                <Link href={`/stores/${store.slug}`} className="flex-1 min-w-0 hover:underline">
                  <span className="block text-sm font-medium truncate">{store.name}</span>
                  <span className="block text-xs text-gray-500 truncate">/{store.slug}</span>
                </Link>
                {activeStore?.id === store.id ? (
                  <span className="flex items-center gap-1 text-xs text-gray-900 shrink-0">
                    <Check className="h-4 w-4" />{t.nav.active}
                  </span>
                ) : (
                  <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => setActiveStore(store)}>
                    {t.nav.use}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
