import { useEffect } from 'react'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { AlertTriangle } from 'lucide-react'
import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'
import { Header } from '#/components/Header'
import { AppNav } from '#/components/AppNav'
import { AuthProvider } from '#/contexts/auth'
import { useAuthContext } from '#/contexts/auth'
import { useUserFamily } from '#/hooks/auth/useUserFamily'
import { useBannedCheck } from '#/hooks/auth/useBannedCheck'
import { MobileNavProvider } from '#/contexts/mobile-nav'

import TanStackQueryProvider from '#/integrations/tanstack-query/root-provider'
import TanStackQueryDevtools from '#/integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=stored==='dark'?'dark':'light';var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(mode);root.setAttribute('data-theme',mode);root.style.colorScheme=mode;}catch(e){}})();`

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Family Space' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Family Space' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/family-space-logo.jpg', type: 'image/jpeg' },
      { rel: 'apple-touch-icon', href: '/family-space-logo.jpg' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  shellComponent: RootDocument,
})

function SuspendedOverlay({ reason }: { reason: string | null }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold">Account Suspended</h1>
      <p className="max-w-sm text-muted-foreground">
        {reason
          ? reason
          : 'Your family account has been suspended. Please contact support for assistance.'}
      </p>
      <p className="text-sm text-muted-foreground">
        Email:{' '}
        <a href="mailto:support@familyspace.app" className="underline">
          support@familyspace.app
        </a>
      </p>
    </div>
  )
}

function BannedOverlay({ reason }: { reason: string | null }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold">Account Suspended</h1>
      <p className="max-w-sm text-muted-foreground">
        {reason
          ? reason
          : 'Your account has been suspended. Please contact support for assistance.'}
      </p>
      <p className="text-sm text-muted-foreground">
        Email:{' '}
        <a href="mailto:support@familyspace.app" className="underline">
          support@familyspace.app
        </a>
      </p>
    </div>
  )
}

const PUBLIC_PATHS = ['/', '/privacy', '/terms']

function AuthedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext()
  const { data: family } = useUserFamily(user?.id)
  const { banned, banReason } = useBannedCheck(user?.id)
  const navigate = useNavigate()
  const { location } = useRouterState()
  const isPublicRoute =
    PUBLIC_PATHS.includes(location.pathname) ||
    location.pathname.startsWith('/invite')

  const isOnboarding = location.pathname === '/onboarding'

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      void navigate({ to: '/' })
    }
  }, [loading, user, isPublicRoute, navigate])

  // Redirect new users to onboarding wizard before they see the app.
  // Note: we cannot use !isPublicRoute here because '/' is in PUBLIC_PATHS
  // (it doubles as the login page for unauthenticated visitors). Instead we
  // explicitly exclude only the routes where an onboarding redirect makes no
  // sense.
  useEffect(() => {
    if (
      user &&
      family &&
      !family.onboardingCompletedAt &&
      !isOnboarding &&
      location.pathname !== '/privacy' &&
      location.pathname !== '/terms' &&
      !location.pathname.startsWith('/invite')
    ) {
      void navigate({ to: '/onboarding' })
    }
  }, [user, family, isOnboarding, location.pathname, navigate])

  // No user: render public routes normally; for protected routes show nothing
  // while the redirect (above) takes effect
  if (!user) {
    if (isPublicRoute) return <main className="flex-1 overflow-auto">{children}</main>
    return null
  }

  // User banned — sign out already triggered by useBannedCheck
  if (banned) {
    return <BannedOverlay reason={banReason} />
  }

  // Family suspended — show full-screen block instead of app content
  if (family?.suspendedAt) {
    return <SuspendedOverlay reason={(family as { suspendReason?: string | null }).suspendReason ?? null} />
  }

  // Onboarding wizard: full-screen, no nav chrome
  if (isOnboarding) {
    return <main className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
  }

  return (
    <div className="relative flex min-h-0 flex-1">
      <AppNav />
      <main className="flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain">
        {children}
      </main>
    </div>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState()
  const isOnboarding = location.pathname === '/onboarding'
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {!isOnboarding && <Header />}
      <AuthedLayout>{children}</AuthedLayout>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere]">
        <AuthProvider>
          <TanStackQueryProvider>
            <TooltipProvider>
              <MobileNavProvider>
                <AppShell>{children}</AppShell>
              </MobileNavProvider>
            </TooltipProvider>
            <Toaster richColors position="bottom-right" />
            {import.meta.env.DEV && (
              <TanStackDevtools
                config={{ position: 'bottom-right' }}
                plugins={[
                  {
                    name: 'Tanstack Router',
                    render: <TanStackRouterDevtoolsPanel />,
                  },
                  TanStackQueryDevtools,
                ]}
              />
            )}
          </TanStackQueryProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}
