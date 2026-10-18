import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isDemoMode } from '#/lib/supabase'
import { signInWithGoogle } from '#/lib/google-auth'
import { refreshGoogleToken } from '#/lib/server/refresh-google-token'

type AuthContextValue = {
  user: User | null
  providerToken: string | null
  providerRefreshToken: string | null
  loading: boolean
  signInWithGoogle: () => void
  signInWithEmail: (email: string, password: string) => Promise<string | null>
  signUpWithEmail: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  refreshProviderToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [providerToken, setProviderToken] = useState<string | null>(null)
  // Persisted separately: Supabase session refreshes strip provider_refresh_token
  // from the session object, so we keep the last known value in state.
  const [persistedRefreshToken, setPersistedRefreshToken] = useState<string | null>(null)

  useEffect(() => {
    if (isDemoMode || !supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setProviderToken(data.session?.provider_token ?? null)
      if (data.session?.provider_refresh_token) {
        setPersistedRefreshToken(data.session.provider_refresh_token)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setUser(s?.user ?? null)
      if (event === 'SIGNED_OUT' || !s) {
        // Clear Google tokens so they don't leak to the next user/session.
        setProviderToken(null)
        setPersistedRefreshToken(null)
      } else {
        // TOKEN_REFRESHED strips provider_* from the session; keep the last known values.
        if (s.provider_token) setProviderToken(s.provider_token)
        if (s.provider_refresh_token) setPersistedRefreshToken(s.provider_refresh_token)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  function handleSignInWithGoogle() {
    signInWithGoogle({ requestOfflineAccess: true })
  }

  async function signInWithEmail(email: string, password: string): Promise<string | null> {
    if (!supabase) return 'Supabase not configured'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function signUpWithEmail(email: string, password: string): Promise<string | null> {
    if (!supabase) return 'Supabase not configured'
    const { error } = await supabase.auth.signUp({ email, password })
    return error?.message ?? null
  }

  async function signOut() {
    await supabase?.auth.signOut()
  }

  async function refreshProviderToken(): Promise<string | null> {
    const refreshToken = persistedRefreshToken
    if (!refreshToken) return null

    const accessToken = await refreshGoogleToken({ data: { refreshToken } })
    if (!accessToken) {
      // Refresh token likely revoked — clear state so re-auth is prompted.
      setProviderToken(null)
      setPersistedRefreshToken(null)
      return null
    }
    setProviderToken(accessToken)
    return accessToken
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        providerToken,
        providerRefreshToken: persistedRefreshToken,
        loading,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProviderToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
