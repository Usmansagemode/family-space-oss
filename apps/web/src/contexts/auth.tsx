import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isDemoMode } from '#/lib/supabase'
import { signInWithGoogle } from '#/lib/google-auth'

// Read before supabase-js clears the hash: PASSWORD_RECOVERY can fire before
// the listener below subscribes.
const RECOVERY_IN_URL =
  typeof window !== 'undefined' && window.location.hash.includes('type=recovery')

type AuthContextValue = {
  user: User | null
  loading: boolean
  signInWithGoogle: () => void
  signInWithEmail: (email: string, password: string) => Promise<string | null>
  sendPasswordReset: (email: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
  /** Signed in through a reset link and has not set a new password yet */
  recovering: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (isDemoMode || !supabase) {
      setLoading(false)
      return
    }

    if (RECOVERY_IN_URL) setRecovering(true)

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') setRecovering(false)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  function handleSignInWithGoogle() {
    signInWithGoogle()
  }

  async function signInWithEmail(email: string, password: string): Promise<string | null> {
    if (!supabase) return 'Supabase not configured'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function sendPasswordReset(email: string): Promise<string | null> {
    if (!supabase) return 'Supabase not configured'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return error?.message ?? null
  }

  async function updatePassword(password: string): Promise<string | null> {
    if (!supabase) return 'Supabase not configured'
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return error.message
    setRecovering(false)
    return null
  }

  async function signOut() {
    await supabase?.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithEmail,
        sendPasswordReset,
        updatePassword,
        recovering,
        signOut,
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
