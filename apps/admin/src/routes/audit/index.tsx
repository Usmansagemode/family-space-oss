import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ScrollText } from 'lucide-react'
import { AdminLayout } from '@/components/AdminLayout'
import { AuditTable } from '@/components/tables/AuditTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTableToolbar } from '@/components/shared/DataTableToolbar'
import { useAdminAuditLog } from '@/hooks/useAdminAuditLog'

export const Route = createFileRoute('/audit/')({
  component: AuditPage,
})

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'family.plan_changed', label: 'Plan changed' },
  { value: 'family.suspended', label: 'Family suspended' },
  { value: 'family.unsuspended', label: 'Family unsuspended' },
  { value: 'user.banned', label: 'User banned' },
  { value: 'user.unbanned', label: 'User unbanned' },
  { value: 'user.promoted_to_admin', label: 'Promoted to admin' },
  { value: 'user.demoted_from_admin', label: 'Demoted from admin' },
  { value: 'feature_flag.plan_updated', label: 'Feature flag updated' },
  { value: 'feature_flag.override_set', label: 'Override set' },
  { value: 'feature_flag.override_removed', label: 'Override removed' },
  { value: 'invite.revoked', label: 'Invite revoked' },
]

function AuditPage() {
  const [action, setAction] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const { data, isLoading } = useAdminAuditLog({
    page,
    action: action || undefined,
    pageSize: PAGE_SIZE,
  })

  const entries = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Audit Log"
          description={`${total} entries`}
        />

        <DataTableToolbar
          search=""
          onSearchChange={() => {}}
          searchPlaceholder=""
          filters={[
            {
              label: 'Action',
              value: action,
              onChange: (v) => { setAction(v); setPage(0) },
              options: ACTION_OPTIONS,
            },
          ]}
        />

        {isLoading ? (
          <div className="animate-pulse rounded-xl border border-border h-64 bg-muted/30" />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="h-8 w-8" />}
            title="No audit entries"
            description="Admin actions will appear here."
          />
        ) : (
          <>
            <AuditTable entries={entries} />
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                    className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
