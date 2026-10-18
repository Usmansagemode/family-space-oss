import { Trash2 } from 'lucide-react'
import type { AdminInvite } from '@family/supabase'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDate } from '@/lib/utils'

type Props = {
  invites: AdminInvite[]
  onRevoke: (token: string) => Promise<void>
}

export function InviteTable({ invites, onRevoke }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="py-3 pl-4 pr-6 text-left font-semibold text-muted-foreground">Token</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Family</th>
            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Created</th>
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {invites.map((inv) => (
            <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/20">
              <td className="py-3 pl-4 pr-6">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{inv.token}</code>
              </td>
              <td className="px-4 py-3 font-medium">{inv.familyName}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.createdAt)}</td>
              <td className="px-3 py-3">
                <ConfirmDialog
                  title="Revoke invite"
                  description={`Revoke this invite for ${inv.familyName}? Anyone with this link will no longer be able to join.`}
                  confirmLabel="Revoke"
                  destructive
                  onConfirm={() => onRevoke(inv.token)}
                  trigger={
                    <button className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
