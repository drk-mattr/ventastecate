'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile, Store } from '@/lib/types/database'

type AuthContextType = {
  user: User | null
  profile: Profile | null
  stores: Store[]
  activeStore: Store | null
  loading: boolean
  /** True once the owner's stores have been fetched (success or
      empty) — the posting form's location prefill waits for this,
      because the store's saved location only exists after the
      fetch lands, and the draft decision usually lands first. */
  storesLoaded: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshStores: () => Promise<void>
  setActiveStore: (store: Store | null) => void
  /** Store IDs ordered most-recently-used first (for ranking the dropdown). */
  recentStoreIds: string[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ACTIVE_STORE_KEY = 'ventastecate_active_store'
const RECENT_STORES_KEY = 'ventastecate_recent_stores'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [activeStore, setActiveStoreState] = useState<Store | null>(null)
  const [recentStoreIds, setRecentStoreIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [storesLoaded, setStoresLoaded] = useState(false)
  const supabase = createClient()

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    setProfile(data)
  }

  const fetchStores = useCallback(async (userId: string) => {
    try {
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })

    const userStores = data || []
    setStores(userStores)

    // Restore recently-used order, dropping any stores that no longer exist.
    try {
      const savedRecents = localStorage.getItem(RECENT_STORES_KEY)
      if (savedRecents) {
        const ids = (JSON.parse(savedRecents) as string[]).filter((id) =>
          userStores.some((s) => s.id === id)
        )
        setRecentStoreIds(ids)
      }
    } catch {
      // ignore localStorage errors
    }

    // Restore active store from localStorage
    try {
      const saved = localStorage.getItem(ACTIVE_STORE_KEY)
      if (saved) {
        const savedStore = JSON.parse(saved) as Store
        const stillExists = userStores.find(s => s.id === savedStore.id)
        if (stillExists) {
          setActiveStoreState(stillExists)
        } else {
          localStorage.removeItem(ACTIVE_STORE_KEY)
        }
      }
    } catch {
      // ignore localStorage errors
    }
    } finally {
      // Settles either way, so a failed fetch can't leave the
      // posting form waiting on a prefill that will never come —
      // it just falls back to the region prefill.
      setStoresLoaded(true)
    }
  }, [supabase])

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const refreshStores = async () => {
    if (user) {
      await fetchStores(user.id)
    }
  }

  const setActiveStore = (store: Store | null) => {
    setActiveStoreState(store)
    if (store) {
      localStorage.setItem(ACTIVE_STORE_KEY, JSON.stringify(store))
      // Bump this store to the front of the most-recently-used list (cap 20).
      setRecentStoreIds((prev) => {
        const next = [store.id, ...prev.filter((id) => id !== store.id)].slice(0, 20)
        try {
          localStorage.setItem(RECENT_STORES_KEY, JSON.stringify(next))
        } catch {
          // ignore localStorage errors
        }
        return next
      })
    } else {
      localStorage.removeItem(ACTIVE_STORE_KEY)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        fetchStores(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        fetchStores(session.user.id)
      } else {
        setProfile(null)
        setStores([])
        setActiveStoreState(null)
        localStorage.removeItem(ACTIVE_STORE_KEY)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setStores([])
    setActiveStoreState(null)
    localStorage.removeItem(ACTIVE_STORE_KEY)
  }

  return (
    <AuthContext.Provider value={{
      user, profile, stores, activeStore, loading, storesLoaded,
      signOut, refreshProfile, refreshStores, setActiveStore, recentStoreIds,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
