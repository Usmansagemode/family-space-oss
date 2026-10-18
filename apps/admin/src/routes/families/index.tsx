import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { FamilyPlan } from '@family/types'
import { AdminLayout } from '@/components/AdminLayout'
import { FamilyTable } from '@/components/tables/FamilyTable'
import { DataTableToolbar } from '@/components/shared/DataTableToolbar'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAdminFamilies } from '@/hooks/useAdminFamilies'
import { Building2 } from 'lucide-react'

export const Route = createFileRoute('/families/')({
  component: FamiliesPage,
})

function FamiliesPage() {
  const [search, setSearch] = useState('')
  const [plan, setPlan] = useState<FamilyPlan | 'all'>('all')
  const [suspended, setSuspended] = useState<'all' | 'yes' | 'no'>('all')

  const { data, isLoading } = useAdminFamilies({
    plan,
    suspended: suspended === 'all' ? undefined : suspended === 'yes',
    search: search || undefined,
  })

  const families = data?.data ?? []
  const total = data?.total ?? 0

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Families"
          description={`${total} total`}
        />

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
            {
              label: 'Status',
              value: suspended,
              onChange: (v) => setSuspended(v as 'all' | 'yes' | 'no'),
              options: [
                { value: 'all', label: 'All statuses' },
                { value: 'no', label: 'Active' },
                { value: 'yes', label: 'Suspended' },
              ],
            },
          ]}
        />

        {isLoading ? (
          <div className="animate-pulse rounded-xl border border-border h-64 bg-muted/30" />
        ) : families.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            title="No families found"
            description="Try adjusting your search or filters."
          />
        ) : (
          <FamilyTable families={families} />
        )}
      </div>
    </AdminLayout>
  )
}
