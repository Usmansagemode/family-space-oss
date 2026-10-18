import { initSupabase, initServiceClient, getSupabaseClient } from '@family/supabase'

const url = import.meta.env['VITE_SUPABASE_URL'] as string
const serviceKey = import.meta.env['VITE_SUPABASE_SERVICE_KEY'] as string

// Auth client — uses service key but will attach user JWT after sign-in
initSupabase(url, serviceKey)

// Dedicated service-role client — never used for auth, always bypasses RLS
initServiceClient(url, serviceKey)

export const supabase = getSupabaseClient()
