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
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshStores: () => Promise<void>
  setActiveStore: (store: Store | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ACTIVE_STORE_KEY = 'ventastecate_active_store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [activeStore, setActiveStoreState] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
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
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })

    const userStores = data || []
    setStores(userStores)

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
      user, profile, stores, activeStore, loading,
      signOut, refreshProfile, refreshStores, setActiveStore,
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
