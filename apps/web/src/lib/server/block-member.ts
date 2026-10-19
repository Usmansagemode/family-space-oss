import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'

// Every signed-in user joins the single family on login, so removing a member
// only sticks if their auth account can no longer sign in. The owner calls
// this before removeFamilyMember(); it bans the account indefinitely.
export const blockMember = createServerFn({ method: 'POST' })
  .validator((input: { accessToken: string; familyId: string; userId: string }) => {
    if (typeof input.accessToken !== 'string' || input.accessToken.length < 20) {
      throw new Error('Invalid access token')
    }
    if (typeof input.familyId !== 'string' || typeof input.userId !== 'string') {
      throw new Error('Invalid input')
    }
    return input
  })
  .handler(async ({ data }): Promise<{ success: boolean; message?: string }> => {
    const url = process.env['VITE_SUPABASE_URL']
    const anonKey = process.env['VITE_SUPABASE_ANON_KEY']
    const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
    if (!url || !anonKey || !serviceKey) {
      return { success: false, message: 'Server configuration error.' }
    }

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return { success: false, message: 'Unauthenticated.' }
    if (user.id === data.userId) return { success: false, message: 'You cannot remove yourself.' }

    // Caller must own the family, and the target must be a member of it
    const { data: rows, error } = await userClient
      .from('user_families')
      .select('user_id, role')
      .eq('family_id', data.familyId)
      .in('user_id', [user.id, data.userId])
    if (error) return { success: false, message: 'Failed to verify membership.' }
    const isOwner = rows.some((r) => r.user_id === user.id && r.role === 'owner')
    const isMember = rows.some((r) => r.user_id === data.userId)
    if (!isOwner || !isMember) return { success: false, message: 'Not allowed.' }

    const service = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: banError } = await service.auth.admin.updateUserById(data.userId, {
      ban_duration: '876000h',
    })
    if (banError) return { success: false, message: 'Failed to block sign-in.' }
    return { success: true }
  })
