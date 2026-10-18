import { useEffect, useState } from 'react'
import { supabase } from '#/lib/supabase'

/**
 * Checks if the signed-in user has been banned (profiles.banned_at IS NOT NULL).
 * If banned, signs out immediately and sets `banned = true`.
 *
 * - Performs an initial check on mount.
 * - Subscribes to Realtime changes on the user's profile row so bans applied
 *   while the user is active take effect within seconds.
 */
export function useBannedCheck(userId: string | undefined): { banned: boolean; banReason: string | null } {
  const [banned, setBanned] = useState(false)
  const [banReason, setBanReason] = useState<string | null>(null)

  // Initial one-shot check on mount
  useEffect(() => {
    if (!userId || !supabase) return

    supabase
      .from('profiles')
      .select('banned_at, ban_reason')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        const row = data as { banned_at: string | null; ban_reason: string | null } | null
        if (row?.banned_at) {
          setBanned(true)
          setBanReason(row.ban_reason)
          supabase?.auth.signOut()
        }
      })
  }, [userId])

  // Realtime subscription — catches bans applied while the user is active
  useEffect(() => {
    if (!userId || !supabase) return

    const channel = supabase
      .channel(`profile-ban-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { banned_at: string | null; ban_reason: string | null }
          if (row.banned_at) {
            setBanned(true)
            setBanReason(row.ban_reason)
            supabase?.auth.signOut()
          }
        },
      )
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [userId])

  return { banned, banReason }
}
