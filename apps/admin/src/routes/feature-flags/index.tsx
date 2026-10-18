import { createFileRoute } from '@tanstack/react-router'
import type { FamilyPlan } from '@family/types'
import { AdminLayout } from '@/components/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { PlanFlagMatrix } from '@/components/flags/PlanFlagMatrix'
import { usePlanFeatureMutations, usePlanFeatures } from '@/hooks/useAdminFeatureFlags'

export const Route = createFileRoute('/feature-flags/')({
  component: FeatureFlagsPage,
})

function FeatureFlagsPage() {
  const { data: features = [], isLoading } = usePlanFeatures()
  const { update } = usePlanFeatureMutations()

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Feature Flags"
          description="Edit the plan feature matrix. Changes take effect within 10 minutes for all active sessions (useDynamicPlan stale time)."
        />

        {isLoading ? (
          <div className="animate-pulse h-64 rounded-xl bg-muted/30 border border-border" />
        ) : (
          <PlanFlagMatrix
            features={features}
            onUpdate={(plan: FamilyPlan, featureKey: string, value) =>
              update.mutateAsync({ plan, featureKey, value })
            }
          />
        )}

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How this works</p>
          <ul className="mt-2 list-disc pl-4 space-y-1">
            <li>
              <strong>Toggle cells</strong> flip boolean features (charts, charts.export, import.ai, expenses.duplicates).
            </li>
            <li>
              <strong>Number cells</strong> set member/group limits. Blank = unlimited (null).
            </li>
            <li>
              Changes are stored in <code>plan_features</code> and picked up by{' '}
              <code>useDynamicPlan</code> within 10 minutes.
            </li>
            <li>
              Per-family overrides on the family detail page always win over these plan defaults.
            </li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  )
}
