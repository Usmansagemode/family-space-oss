import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { AdminLayout } from '@/components/AdminLayout'
import { UserTable } from '@/components/tables/UserTable'
import { DataTableToolbar } from '@/components/shared/DataTableToolbar'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAdminUsers } from '@/hooks/useAdminUsers'

export const Route = createFileRoute('/users/')({
  component: UsersPage,
})

function UsersPage() {
  const [search, setSearch] = useState('')
  const [banned, setBanned] = useState<'all' | 'yes' | 'no'>('all')

  const { data, isLoading } = useAdminUsers({
    banned: banned === 'all' ? undefined : banned === 'yes',
    search: search || undefined,
  })

  const users = data?.data ?? []
  const total = data?.total ?? 0

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <PageHeader title="Users" description={`${total} total`} />

        <DataTableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or email…"
          filters={[
            {
              label: 'Status',
              value: banned,
              onChange: (v) => setBanned(v as 'all' | 'yes' | 'no'),
              options: [
                { value: 'all', label: 'All users' },
                { value: 'no', label: 'Active' },
                { value: 'yes', label: 'Banned' },
              ],
            },
          ]}
        />

        {isLoading ? (
          <div className="animate-pulse rounded-xl border border-border h-64 bg-muted/30" />
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No users found"
            description="Try adjusting your search or filters."
          />
        ) : (
          <UserTable users={users} />
        )}
      </div>
    </AdminLayout>
  )
}
