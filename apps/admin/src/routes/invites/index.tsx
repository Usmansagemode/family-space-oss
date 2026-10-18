import { createFileRoute } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { AdminLayout } from '@/components/AdminLayout'
import { InviteTable } from '@/components/tables/InviteTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAdminInviteMutations, useAdminInvites } from '@/hooks/useAdminInvites'

export const Route = createFileRoute('/invites/')({
  component: InvitesPage,
})

function InvitesPage() {
  const { data: invites = [], isLoading } = useAdminInvites()
  const { revoke } = useAdminInviteMutations()

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Pending Invites"
          description={`${invites.length} unused invite link${invites.length !== 1 ? 's' : ''}`}
        />

        {isLoading ? (
          <div className="animate-pulse rounded-xl border border-border h-64 bg-muted/30" />
        ) : invites.length === 0 ? (
          <EmptyState
            icon={<Mail className="h-8 w-8" />}
            title="No pending invites"
            description="All invite links have been used or there are none yet."
          />
        ) : (
          <InviteTable
            invites={invites}
            onRevoke={(token) => revoke.mutateAsync({ token })}
          />
        )}
      </div>
    </AdminLayout>
  )
}
