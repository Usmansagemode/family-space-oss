import { Link } from '@tanstack/react-router'
import { Ban, Shield } from 'lucide-react'
import type { AdminProfile } from '@family/types'
import { formatDate } from '@/lib/utils'

type Props = {
  users: AdminProfile[]
}

export function UserTable({ users }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="py-3 pl-4 pr-6 text-left font-semibold text-muted-foreground">User</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Email</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Families</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Joined</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Roles</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20">
              <td className="py-3 pl-4 pr-6">
                <Link
                  to="/users/$userId"
                  params={{ userId: u.id }}
                  className="flex items-center gap-2 hover:text-primary"
                >
                  {u.avatarUrl ? (
                    <img
                      src={u.avatarUrl}
                      alt={u.name ?? 'User'}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {(u.name ?? u.email ?? '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium">{u.name ?? '(No name)'}</span>
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{u.email ?? '—'}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{u.familyCount}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
              <td className="px-4 py-3">
                {u.isAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <Shield className="h-3 w-3" />
                    Admin
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {u.bannedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <Ban className="h-3 w-3" />
                    Banned
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Active
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
