import { initSupabase, getSupabaseClient } from '@family/supabase'

const initialized = initSupabase(
  import.meta.env['VITE_SUPABASE_URL'] as string | undefined,
  import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined,
)

export const isDemoMode = !initialized

// Re-export for any code that still imports { supabase } from '#/lib/supabase'
export const supabase = initialized ? getSupabaseClient() : null
