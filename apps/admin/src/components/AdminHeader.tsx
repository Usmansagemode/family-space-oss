import { LogOut, Shield } from 'lucide-react'
import { useAdminAuth } from '@/contexts/auth'

export function AdminHeader() {
  const { adminUser, signOut } = useAdminAuth()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      {/* Left: environment badge */}
      <div className="flex items-center gap-2">
        {import.meta.env.VITE_APP_ENV === 'develop' ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Develop
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Production
          </span>
        )}
      </div>

      {/* Right: admin identity + sign out */}
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">
            {adminUser?.email ?? 'Admin'}
          </span>
        </div>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          onClick={signOut}
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  )
}
