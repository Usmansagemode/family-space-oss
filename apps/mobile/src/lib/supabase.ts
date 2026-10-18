import { initSupabase } from '@family/supabase'

// Mobile uses EXPO_PUBLIC_ prefix for client-side env vars.
// Call this once at app startup (imported by _layout.tsx or App.tsx).
initSupabase(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
)
