import { Link } from '@tanstack/react-router'
import {
  BarChart3,
  Building2,
  CreditCard,
  LayoutDashboard,
  Mail,
  ScrollText,
  ToggleLeft,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_SECTIONS = [
  {
    label: 'Platform',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/families', label: 'Families', icon: Building2 },
      { to: '/users', label: 'Users', icon: Users },
    ],
  },
  {
    label: 'Finances',
    items: [
      { to: '/billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    label: 'Config',
    items: [
      { to: '/feature-flags', label: 'Feature Flags', icon: ToggleLeft },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/invites', label: 'Invites', icon: Mail },
      { to: '/audit', label: 'Audit Log', icon: ScrollText },
    ],
  },
] as const

export function AdminNav() {
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <img
          src="/family-space-logo.jpg"
          alt="Family Space"
          className="h-7 w-7 shrink-0 rounded-lg object-cover"
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight text-sidebar-foreground tracking-tight">
            Family Space
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-primary">
            Admin
          </span>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-col gap-0.5">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {section.label}
            </p>
            {section.items.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/60 transition-colors',
                  'hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  '[&.active]:bg-sidebar-accent [&.active]:text-sidebar-primary',
                )}
              >
                {/* Active left-border indicator */}
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary opacity-0 transition-opacity group-[.active]:opacity-100" />
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
