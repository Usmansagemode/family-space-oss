import { Pencil, Trash2, Plus } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { formatCurrency, parseLocalDate } from '#/lib/utils'
import { cn } from '#/lib/utils'
import type { Tracker, TrackerEntry } from '@family/types'

type Props = {
  tracker: Tracker
  entries: TrackerEntry[]
  familyId: string
  currency?: string
  locale?: string
  onEdit: () => void
  onDelete: () => void
  onAddEntry: () => void
  onDeleteEntry?: (entry: TrackerEntry) => void
}

export function TrackerCard({
  tracker,
  entries,
  currency,
  locale,
  onEdit,
  onDelete,
  onAddEntry,
}: Props) {
  const recentEntries = entries.slice(0, 5)
  const isPositive = tracker.currentBalance >= 0
  const accentColor = tracker.color ?? 'oklch(0.60 0.15 250)'

  return (
    <Card
      className="relative overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
    >
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{tracker.title}</CardTitle>
            {tracker.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {tracker.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div>
          <p
            className={cn(
              'text-3xl font-bold tabular-nums',
              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
            )}
          >
            {formatCurrency(tracker.currentBalance, currency, locale)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Initial: {formatCurrency(tracker.initialBalance, currency, locale)}
          </p>
        </div>

        {recentEntries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-1 text-left font-medium">Date</th>
                  <th className="pb-1 text-left font-medium">Note</th>
                  <th className="pb-1 text-right font-medium">In</th>
                  <th className="pb-1 text-right font-medium">Out</th>
                  <th className="pb-1 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((entry) => {
                  const d = parseLocalDate(entry.date)
                  return (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-1 text-muted-foreground">
                        {d.toLocaleDateString(locale, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-1 max-w-[80px] truncate">
                        {entry.description ?? '—'}
                      </td>
                      <td className="py-1 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {entry.debit > 0
                          ? formatCurrency(entry.debit, currency, locale)
                          : '—'}
                      </td>
                      <td className="py-1 text-right tabular-nums text-red-600 dark:text-red-400">
                        {entry.credit > 0
                          ? formatCurrency(entry.credit, currency, locale)
                          : '—'}
                      </td>
                      <td className="py-1 text-right tabular-nums font-medium">
                        {formatCurrency(entry.balance, currency, locale)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <Button size="sm" variant="outline" onClick={onAddEntry} className="self-start">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add entry
        </Button>
      </CardContent>
    </Card>
  )
}
