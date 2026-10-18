import { useEffect } from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { AdminAuthProvider, useAdminAuth } from '@/contexts/auth'
import TanStackQueryProvider from '@/integrations/tanstack-query/root-provider'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Family Space — Admin' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { adminUser, loading, accessDenied } = useAdminAuth()
  const navigate = useNavigate()
  const routerState = useRouterState()
  const isLoginPage = routerState.location.pathname === '/login'

  useEffect(() => {
    if (loading) return
    if (!adminUser && !isLoginPage) {
      navigate({ to: '/login' })
    } else if (adminUser && isLoginPage) {
      navigate({ to: '/dashboard' })
    }
  }, [adminUser, loading, isLoginPage, navigate])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-sm text-muted-foreground">
          This account does not have admin privileges.
        </p>
      </div>
    )
  }

  return <>{children}</>
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        <TanStackQueryProvider>
          <AdminAuthProvider>
            <AdminAuthGuard>
              <Outlet />
            </AdminAuthGuard>
            <Toaster richColors position="bottom-right" />
          </AdminAuthProvider>
        </TanStackQueryProvider>
        <Scripts />
      </body>
    </html>
  )
}
