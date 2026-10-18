import { supabase } from '#/lib/supabase'

// Initiates Google OAuth sign-in via Supabase.
// Pass requestOfflineAccess: true (main app) to get a refresh token for Calendar API.
// Pass redirectTo to override the default (defaults to current page origin).
export function signInWithGoogle(opts?: {
  redirectTo?: string
  requestOfflineAccess?: boolean
}) {
  void supabase?.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/calendar',
      redirectTo: opts?.redirectTo ?? window.location.origin,
      ...(opts?.requestOfflineAccess && {
        queryParams: { access_type: 'offline', prompt: 'consent' },
      }),
    },
  })
}
