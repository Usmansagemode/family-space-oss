import type { AuditLogEntry } from '@family/types'
import { timeAgo } from '@/lib/utils'

type Props = {
  entries: AuditLogEntry[]
}

const ACTION_COLOR: Record<string, string> = {
  'family.plan_changed': 'text-blue-600 dark:text-blue-400',
  'family.suspended': 'text-red-600 dark:text-red-400',
  'family.unsuspended': 'text-emerald-600 dark:text-emerald-400',
  'user.banned': 'text-red-600 dark:text-red-400',
  'user.unbanned': 'text-emerald-600 dark:text-emerald-400',
  'user.promoted_to_admin': 'text-violet-600 dark:text-violet-400',
  'user.demoted_from_admin': 'text-orange-600 dark:text-orange-400',
  'feature_flag.plan_updated': 'text-amber-600 dark:text-amber-400',
  'feature_flag.override_set': 'text-amber-600 dark:text-amber-400',
  'feature_flag.override_removed': 'text-muted-foreground',
  'invite.revoked': 'text-red-600 dark:text-red-400',
}

export function AuditTable({ entries }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="py-3 pl-4 pr-6 text-left font-semibold text-muted-foreground">Time</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Admin</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Action</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Target</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Payload</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/20">
              <td className="py-3 pl-4 pr-6 text-muted-foreground whitespace-nowrap">
                {timeAgo(e.createdAt)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {e.adminName ?? e.adminId?.slice(0, 8) ?? '—'}
              </td>
              <td className={`px-4 py-3 font-mono text-xs font-medium ${ACTION_COLOR[e.action] ?? 'text-foreground'}`}>
                {e.action}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <span className="text-xs">
                  {e.targetType}
                  {e.targetId && (
                    <span className="ml-1 opacity-60">{e.targetId.slice(0, 8)}</span>
                  )}
                </span>
              </td>
              <td className="px-4 py-3">
                <details className="cursor-pointer">
                  <summary className="text-xs text-muted-foreground hover:text-foreground">
                    View
                  </summary>
                  <pre className="mt-1 max-w-xs overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
