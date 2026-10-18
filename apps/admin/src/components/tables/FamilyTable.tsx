import { Link } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import type { AdminFamily, FamilyPlan } from '@family/types'
import { formatDate } from '@/lib/utils'

type Props = {
  families: AdminFamily[]
}

const PLAN_BADGE: Record<FamilyPlan, string> = {
  free: 'bg-muted text-muted-foreground',
  plus: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pro: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
}

export function FamilyTable({ families }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="py-3 pl-4 pr-6 text-left font-semibold text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Plan</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Members</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Expenses</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Created</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {families.map((f) => (
            <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/20">
              <td className="py-3 pl-4 pr-6">
                <Link
                  to="/families/$familyId"
                  params={{ familyId: f.id }}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {f.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PLAN_BADGE[f.plan]}`}
                >
                  {f.plan}
                </span>
              </td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{f.memberCount}</td>
              <td className="px-4 py-3 tabular-nums text-muted-foreground">{f.expenseCount}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(f.createdAt)}</td>
              <td className="px-4 py-3">
                {f.suspendedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    Suspended
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
