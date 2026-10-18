import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type AdminAuthContextValue = {
  adminUser: User | null
  loading: boolean
  accessDenied: boolean
  signInWithEmail: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  async function checkAdminStatus(user: User): Promise<boolean> {
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    return (data as { is_admin: boolean } | null)?.is_admin === true
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user ?? null
      if (user) {
        const isAdmin = await checkAdminStatus(user)
        if (isAdmin) {
          setAdminUser(user)
          setAccessDenied(false)
        } else {
          await supabase.auth.signOut()
          setAdminUser(null)
          setAccessDenied(true)
        }
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      if (user) {
        const isAdmin = await checkAdminStatus(user)
        if (isAdmin) {
          setAdminUser(user)
          setAccessDenied(false)
        } else {
          await supabase.auth.signOut()
          setAdminUser(null)
          setAccessDenied(true)
        }
      } else {
        setAdminUser(null)
        setAccessDenied(false)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithEmail(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    setAdminUser(null)
    setAccessDenied(false)
  }

  return (
    <AdminAuthContext.Provider
      value={{ adminUser, loading, accessDenied, signInWithEmail, signOut }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
