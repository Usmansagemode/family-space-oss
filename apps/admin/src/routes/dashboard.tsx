import { createFileRoute } from '@tanstack/react-router'
import {
  BarChart3,
  Building2,
  Mail,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { AdminLayout } from '@/components/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { usePlatformStats } from '@/hooks/usePlatformStats'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { data: stats, isLoading } = usePlatformStats()

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Dashboard"
          description="Platform health overview"
        />

        {isLoading || !stats ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <>
            {/* Core stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Total Families"
                value={stats.totalFamilies}
                icon={Building2}
                colorScheme="blue"
              />
              <StatCard
                label="Total Users"
                value={stats.totalUsers}
                icon={Users}
                colorScheme="green"
              />
              <StatCard
                label="Pending Invites"
                value={stats.pendingInvites}
                icon={Mail}
                colorScheme="amber"
              />
              <StatCard
                label="Banned Users"
                value={stats.bannedUsers}
                icon={ShieldAlert}
                colorScheme="red"
              />
            </div>

            {/* Plan distribution */}
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Plan Distribution
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Free"
                  value={stats.freeFamilies}
                  icon={BarChart3}
                  colorScheme="default"
                />
                <StatCard
                  label="Plus"
                  value={stats.plusFamilies}
                  icon={BarChart3}
                  colorScheme="blue"
                />
                <StatCard
                  label="Pro"
                  value={stats.proFamilies}
                  icon={BarChart3}
                  colorScheme="violet"
                />
              </div>
            </div>

            {/* Suspended families alert */}
            {stats.suspendedFamilies > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                  <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                    {stats.suspendedFamilies} {stats.suspendedFamilies === 1 ? 'family' : 'families'} currently suspended
                  </p>
                  <p className="text-xs text-amber-700/70 dark:text-amber-500/70">
                    Review in the Families section.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
