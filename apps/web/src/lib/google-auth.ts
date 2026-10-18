import { supabase } from '#/lib/supabase'

// Initiates Google OAuth sign-in via Supabase (default profile + email scopes).
// Pass redirectTo to override the default (defaults to current page origin).
export function signInWithGoogle(opts?: { redirectTo?: string }) {
  void supabase?.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: opts?.redirectTo ?? window.location.origin,
    },
  })
}
