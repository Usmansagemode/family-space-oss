import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null
let _serviceClient: SupabaseClient | null = null

export function initSupabase(
  url: string | undefined,
  key: string | undefined,
): boolean {
  if (!url || !key) {
    console.warn(
      '[family-app] Missing Supabase credentials — database features will be unavailable. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.',
    )
    return false
  }
  _client = createClient(url, key)
  return true
}

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    throw new Error('Supabase not initialized — call initSupabase() first.')
  }
  return _client
}

/**
 * Initialize a service-role client used exclusively for admin DB mutations.
 * Never call auth methods on this client — it bypasses RLS via the service key.
 */
export function initServiceClient(url: string, serviceKey: string): void {
  if (_serviceClient) return
  _serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Returns the service-role Supabase client that bypasses RLS.
 * Only available in the admin app.
 */
export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    throw new Error('Service client not initialized — call initServiceClient() first.')
  }
  return _serviceClient
}
