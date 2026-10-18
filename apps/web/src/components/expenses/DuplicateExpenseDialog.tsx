import { AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { formatCurrency, parseLocalDate } from '#/lib/utils'
import type { DuplicateReason } from '#/lib/duplicate-detection'

export type DuplicateEntry = {
  id: string
  date: string
  amount: number
  description?: string
  categoryName: string | null
  categoryColor?: string | null
  locationName: string | null
  paidByName: string | null
  /** 'db' = already saved to the database, 'import' = pending import row */
  source: 'db' | 'import'
  /** Why this pair was flagged — present on match entries, absent on the flagged entry itself */
  reason?: DuplicateReason
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  flagged: DuplicateEntry
  matches: DuplicateEntry[]
  currency?: string
  locale?: string
  onDelete: (id: string, source: 'db' | 'import') => void
  onKeepAll: () => void
  isDeleting?: boolean
}

function EntryCard({
  entry,
  currency,
  locale,
}: {
  entry: DuplicateEntry
  currency?: string
  locale?: string
}) {
  const d = parseLocalDate(entry.date)
  const meta = [entry.categoryName, entry.locationName, entry.paidByName]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <span>{d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span className="text-muted-foreground">·</span>
        <span className="tabular-nums">{formatCurrency(entry.amount, currency, locale)}</span>
      </div>
      {(entry.description || meta) && (
        <p className="truncate text-xs text-muted-foreground">
          {[entry.description, meta].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  )
}

export function DuplicateExpenseDialog({
  open,
  onOpenChange,
  flagged,
  matches,
  currency,
  locale,
  onDelete,
  onKeepAll,
  isDeleting,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
            <DialogTitle>Possible Duplicate</DialogTitle>
          </div>
          <DialogDescription>
            This expense may already exist. Delete any you don't want to keep.
          </DialogDescription>
        </DialogHeader>

        {/* Flagged entry */}
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-950/20">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              This entry
            </p>
            <EntryCard entry={flagged} currency={currency} locale={locale} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive"
            disabled={isDeleting}
            aria-label="Delete this expense"
            onClick={() => onDelete(flagged.id, flagged.source)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Matches */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {matches.length === 1 ? '1 match found' : `${matches.length} matches found`}
          </p>
          <ul className="max-h-56 space-y-1.5 overflow-y-auto">
            {matches.map((match) => (
              <li
                key={match.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap gap-1">
                    {match.source === 'import' && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">
                        From import
                      </span>
                    )}
                    {match.reason && (
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                        match.reason === 'amount+date'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground'
                      }`}>
                        {match.reason === 'amount+date' ? 'Same amount · same date' : 'Same amount · same category'}
                      </span>
                    )}
                  </div>
                  <EntryCard entry={match} currency={currency} locale={locale} />
                </div>
                {/* min 44×44 touch target via p-2 + h-9 w-9 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive"
                  disabled={isDeleting}
                  aria-label="Delete this expense"
                  onClick={() => onDelete(match.id, match.source)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onKeepAll} disabled={isDeleting}>
            Keep all
          </Button>
          <Button onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
