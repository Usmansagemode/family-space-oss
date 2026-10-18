import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CreditCard } from 'lucide-react'
import type { FamilyPlan } from '@family/types'
import { AdminLayout } from '@/components/AdminLayout'
import { DataTableToolbar } from '@/components/shared/DataTableToolbar'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StripeStatusBadge } from '@/components/billing/StripeStatusBadge'
import { useAdminFamilies } from '@/hooks/useAdminFamilies'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/billing/')({
  component: BillingPage,
})

const PLAN_BADGE: Record<FamilyPlan, string> = {
  free: 'bg-muted text-muted-foreground',
  plus: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pro: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
}

function BillingPage() {
  const [search, setSearch] = useState('')
  const [plan, setPlan] = useState<FamilyPlan | 'all'>('all')

  const { data, isLoading } = useAdminFamilies({
    plan,
    search: search || undefined,
  })

  const families = data?.data ?? []

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <PageHeader title="Billing" description="Stripe subscription status per family" />

        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search families…"
          filters={[
            {
              label: 'Plan',
              value: plan,
              onChange: (v) => setPlan(v as FamilyPlan | 'all'),
              options: [
                { value: 'all', label: 'All plans' },
                { value: 'free', label: 'Free' },
                { value: 'plus', label: 'Plus' },
                { value: 'pro', label: 'Pro' },
              ],
            },
          ]}
        />

        {isLoading ? (
          <div className="animate-pulse rounded-xl border border-border h-64 bg-muted/30" />
        ) : families.length === 0 ? (
          <EmptyState icon={<CreditCard className="h-8 w-8" />} title="No results" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="py-3 pl-4 pr-6 text-left font-semibold text-muted-foreground">Family</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Stripe Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Customer ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {families.map((f) => (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="py-3 pl-4 pr-6">
                      <Link
                        to="/billing/$familyId"
                        params={{ familyId: f.id }}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {f.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PLAN_BADGE[f.plan]}`}>
                        {f.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StripeStatusBadge status={f.stripeSubscriptionStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-muted-foreground">{f.stripeCustomerId ?? '—'}</code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
