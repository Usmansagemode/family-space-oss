import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2, Home } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { getInviteByToken, acceptInvite } from '#/lib/supabase/invites'
import { signInWithGoogle } from '#/lib/google-auth'
import { useAuthContext } from '#/contexts/auth'
import type { InviteInfo } from '#/lib/supabase/invites'

export const Route = createFileRoute('/invite')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: InvitePage,
})

type Status =
  | 'loading-invite'
  | 'ready'
  | 'signing-in'
  | 'accepting'
  | 'done'
  | 'already-member'
  | 'limit-reached'
  | 'invalid'

function InvitePage() {
  const { token } = Route.useSearch()
  const { user, loading: authLoading } = useAuthContext()
  const navigate = useNavigate()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [status, setStatus] = useState<Status>('loading-invite')

  // Load invite info
  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }
    getInviteByToken(token)
      .then((info) => {
        if (!info) {
          setStatus('invalid')
        } else {
          setInvite(info)
          setStatus('ready')
        }
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  // Auto-accept once user is logged in and invite is loaded
  useEffect(() => {
    if (authLoading || status !== 'ready' || !user || !invite) return
    setStatus('accepting')
    acceptInvite(token, user.id, invite.familyId)
      .then(() => setStatus('done'))
      .catch((err: { code?: string; message?: string }) => {
        if (err.code === '23505') {
          setStatus('already-member')
        } else if (err.message?.includes('member_limit_reached')) {
          setStatus('limit-reached')
        } else {
          setStatus('invalid')
        }
      })
  }, [authLoading, status, user, invite, token])

  function handleSignIn() {
    signInWithGoogle({ redirectTo: window.location.href })
  }

  function goHome() {
    void navigate({ to: '/' })
  }

  // Loading invite info
  if (status === 'loading-invite' || authLoading) {
    return (
      <InviteShell>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </InviteShell>
    )
  }

  // Invalid or already used
  if (status === 'invalid') {
    return (
      <InviteShell>
        <p className="text-lg font-semibold">Invalid invite</p>
        <p className="text-sm text-muted-foreground">
          This link has already been used or is no longer valid.
        </p>
        <Button onClick={goHome} className="gap-2">
          <Home className="h-4 w-4" />
          Go home
        </Button>
      </InviteShell>
    )
  }

  // Family is at member limit
  if (status === 'limit-reached') {
    return (
      <InviteShell>
        <p className="text-lg font-semibold">Family is full</p>
        <p className="text-sm text-muted-foreground">
          This family has reached its member limit. Ask the owner to upgrade their plan.
        </p>
        <Button onClick={goHome} className="gap-2">
          <Home className="h-4 w-4" />
          Go home
        </Button>
      </InviteShell>
    )
  }

  // Accepting in progress
  if (status === 'accepting') {
    return (
      <InviteShell>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Joining family space…</p>
      </InviteShell>
    )
  }

  // Done
  if (status === 'done' || status === 'already-member') {
    return (
      <InviteShell>
        <p className="text-lg font-semibold">
          {status === 'done'
            ? `You've joined ${invite?.familyName}!`
            : `You're already a member`}
        </p>
        <p className="text-sm text-muted-foreground">
          {status === 'done'
            ? 'Welcome to the family space.'
            : `You already have access to ${invite?.familyName}.`}
        </p>
        <Button onClick={goHome} className="gap-2">
          <Home className="h-4 w-4" />
          Open Family Space
        </Button>
      </InviteShell>
    )
  }

  // Ready — need to sign in
  if (!user) {
    return (
      <InviteShell>
        <p className="text-lg font-semibold">
          You're invited to {invite?.familyName}
        </p>
        <p className="text-sm text-muted-foreground">
          Sign in with Google to join.
        </p>
        <Button onClick={handleSignIn} className="gap-2" size="lg">
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </Button>
      </InviteShell>
    )
  }

  // Logged in but status is still 'ready' — waiting for accept effect
  return (
    <InviteShell>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </InviteShell>
  )
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      {children}
    </div>
  )
}
