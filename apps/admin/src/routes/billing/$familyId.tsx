import { createFileRoute } from '@tanstack/react-router'
import type { FamilyPlan } from '@family/types'
import { AdminLayout } from '@/components/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { PlanOverrideDialog } from '@/components/billing/PlanOverrideDialog'
import { StripeStatusBadge } from '@/components/billing/StripeStatusBadge'
import { useAdminFamily, useAdminFamilyMutations } from '@/hooks/useAdminFamilies'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/billing/$familyId')({
  component: BillingDetailPage,
})

function BillingDetailPage() {
  const { familyId } = Route.useParams()
  const { data: family, isLoading } = useAdminFamily(familyId)
  const { changePlan } = useAdminFamilyMutations()

  if (isLoading || !family) {
    return (
      <AdminLayout>
        <div className="animate-pulse h-48 rounded-xl bg-muted" />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={family.name}
          description="Billing details"
          action={
            <PlanOverrideDialog
              familyId={familyId}
              currentPlan={family.plan}
              onConfirm={(plan: FamilyPlan, reason: string) =>
                changePlan.mutateAsync({ familyId, plan, reason })
              }
              trigger={
                <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent">
                  Change Plan
                </button>
              }
            />
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[
            { label: 'Plan', value: family.plan },
            { label: 'Currency', value: family.currency },
            { label: 'Created', value: formatDate(family.createdAt) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold capitalize">{value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Stripe</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Subscription Status</p>
              <div className="mt-1.5">
                <StripeStatusBadge status={family.stripeSubscriptionStatus} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Customer ID</p>
              <p className="mt-1 font-mono text-xs">{family.stripeCustomerId ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subscription ID</p>
              <p className="mt-1 font-mono text-xs">{family.stripeSubscriptionId ?? '—'}</p>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
