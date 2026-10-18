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
import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'
import { Header } from '#/components/Header'
import { AppNav } from '#/components/AppNav'
import { AuthProvider } from '#/contexts/auth'
import { useAuthContext } from '#/contexts/auth'
import { useUserFamily } from '#/hooks/auth/useUserFamily'
import { useFamilyMembers } from '#/hooks/auth/useFamilyMembers'
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

const PUBLIC_PATHS = ['/']

function AuthedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext()
  const { data: family } = useUserFamily(user?.id)
  const { data: members } = useFamilyMembers(family?.id)
  const role = members?.find((m) => m.userId === user?.id)?.role
  const navigate = useNavigate()
  const { location } = useRouterState()
  const isPublicRoute = PUBLIC_PATHS.includes(location.pathname)

  const isOnboarding = location.pathname === '/onboarding'

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      void navigate({ to: '/' })
    }
  }, [loading, user, isPublicRoute, navigate])

  // Redirect the owner to the onboarding wizard until the family is set up.
  // Members never see it: only the owner can update the family row, so a
  // member who logs in before onboarding finishes goes straight to the board.
  // Note: we cannot use !isPublicRoute here because '/' is in PUBLIC_PATHS
  // (it doubles as the login page for unauthenticated visitors). Instead we
  // explicitly exclude only the routes where an onboarding redirect makes no
  // sense.
  useEffect(() => {
    if (
      user &&
      family &&
      role === 'owner' &&
      !family.onboardingCompletedAt &&
      !isOnboarding
    ) {
      void navigate({ to: '/onboarding' })
    }
  }, [user, family, role, isOnboarding, navigate])

  // Members never run onboarding (see above)
  useEffect(() => {
    if (isOnboarding && role === 'member') void navigate({ to: '/', search: { tab: undefined } })
  }, [isOnboarding, role, navigate])

  // No user: render public routes normally; for protected routes show nothing
  // while the redirect (above) takes effect
  if (!user) {
    if (isPublicRoute) return <main className="flex-1 overflow-auto">{children}</main>
    return null
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
