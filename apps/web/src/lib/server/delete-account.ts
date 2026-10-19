import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import { initServiceClient, deleteUserCompletely } from '@family/supabase'

export type DeleteAccountResult =
  | { success: true }
  | { success: false; code: 401 | 403 | 500; message: string }

export const deleteAccount = createServerFn({ method: 'POST' })
  .validator((input: { accessToken: string }) => {
    if (typeof input?.accessToken !== 'string' || input.accessToken.length < 20) {
      throw new Error('Invalid access token')
    }
    return input
  })
  .handler(async ({ data }): Promise<DeleteAccountResult> => {
    const url = process.env['VITE_SUPABASE_URL']
    const anonKey = process.env['VITE_SUPABASE_ANON_KEY']
    const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

    if (!url || !anonKey || !serviceKey) {
      return { success: false, code: 500, message: 'Server configuration error.' }
    }

    // Verify JWT and identify the requesting user.
    // User-scoped client (anon key + Authorization header) sets the RLS context
    // so the owner-guard queries below are automatically scoped to this user's families.
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    })
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()
    if (authError || !user) {
      return { success: false, code: 401, message: 'Unauthenticated.' }
    }

    // Owner guard: block deletion if the user owns any family that has other members.
    // Solo-owned families are fine — deleteUserCompletely will clean them up.
    const { data: ownedFamilies, error: ownerErr } = await userClient
      .from('user_families')
      .select('family_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')

    if (ownerErr) {
      return { success: false, code: 500, message: 'Failed to verify account status.' }
    }

    for (const { family_id } of ownedFamilies ?? []) {
      const { count, error: countErr } = await userClient
        .from('user_families')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', family_id)

      if (countErr) {
        return { success: false, code: 500, message: 'Failed to verify account status.' }
      }

      if ((count ?? 0) > 1) {
        return {
          success: false,
          code: 403,
          message: 'Remove other members before deleting your account.',
        }
      }
    }

    // Initialize the service-role client used by deleteUserCompletely (no-op if already set).
    initServiceClient(url, serviceKey)

    try {
      // Handles: unlink system person spaces → delete owned families → delete auth user.
      await deleteUserCompletely(user.id)
    } catch (err) {
      // Log server-side so partially-deleted state (families gone, auth user still alive)
      // is observable in server logs and can be cleaned up by the instance owner.
      console.error('[deleteAccount] failed for user', user.id, err)
      return {
        success: false,
        code: 500,
        message: 'Account deletion failed. Some data may have been removed — check the server logs.',
      }
    }

    return { success: true }
  })
