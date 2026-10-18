import { useMemo, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteExpense } from '@family/supabase'
import type { ExpenseWithNames } from '@family/types'
import { useCSVImport } from '#/contexts/csvImport'
import type { ImportExpense } from '#/contexts/csvImport'
import { DuplicateExpenseDialog } from '#/components/expenses/DuplicateExpenseDialog'
import type { DuplicateEntry } from '#/components/expenses/DuplicateExpenseDialog'
import { detectDuplicates } from '#/lib/duplicate-detection'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { formatCurrency } from '#/lib/utils'

interface Props {
  currency?: string
  locale?: string
  showDuplicates?: boolean
}

function importToEntry(e: ImportExpense): DuplicateEntry {
  return {
    id: e.id, date: e.date, amount: e.amount,
    description: e.description || undefined,
    categoryName: e.categoryName, locationName: e.locationName,
    paidByName: e.paidByName, source: 'import',
  }
}

function dbToEntry(e: ExpenseWithNames): DuplicateEntry {
  return {
    id: e.id, date: e.date, amount: e.amount, description: e.description,
    categoryName: e.categoryName, categoryColor: e.categoryColor,
    locationName: e.locationName, paidByName: e.paidByName, source: 'db',
  }
}

export function ImportPreviewTable({ currency, locale, showDuplicates = false }: Props) {
  const { mappedData, setMappedData, existingExpenses } = useCSVImport()

  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Track DB expenses deleted from the dialog (so they disappear from the detection pool)
  const [deletedDbIds, setDeletedDbIds] = useState<Set<string>>(new Set())
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  // Duplicate dialog state
  const [dupOpen, setDupOpen] = useState(false)
  const [dupFlagged, setDupFlagged] = useState<DuplicateEntry | null>(null)
  const [dupMatches, setDupMatches] = useState<DuplicateEntry[]>([])

  const visibleExisting = useMemo(
    () => existingExpenses.filter((e) => !deletedDbIds.has(e.id)),
    [existingExpenses, deletedDbIds],
  )

  const duplicateMap = useMemo(
    () => showDuplicates ? detectDuplicates([...mappedData, ...visibleExisting]) : new Map(),
    [mappedData, visibleExisting, showDuplicates],
  )

  const allSelected = mappedData.length > 0 && mappedData.every((e) => selected.has(e.id))
  const selectedIds = [...selected]

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(mappedData.map((e) => e.id)))
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function removeRow(id: string) {
    setMappedData(mappedData.filter((e) => e.id !== id))
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  function removeSelected() {
    setMappedData(mappedData.filter((e) => !selected.has(e.id)))
    setSelected(new Set())
  }

  function getMatches(id: string): DuplicateEntry[] {
    const matches = duplicateMap.get(id) ?? []
    return matches
      .map(({ id: mid, reason }) => {
        const imp = mappedData.find((e) => e.id === mid)
        if (imp) return { ...importToEntry(imp), reason }
        const db = visibleExisting.find((e) => e.id === mid)
        if (db) return { ...dbToEntry(db), reason }
        return null
      })
      .filter(Boolean) as DuplicateEntry[]
  }

  function closeDialog() { setDupOpen(false); setDupFlagged(null); setDupMatches([]) }

  async function handleDeleteMatch(id: string, source: 'db' | 'import') {
    const isFlagged = id === dupFlagged?.id

    if (source === 'import') {
      removeRow(id)
      if (isFlagged) { closeDialog(); return }
      const remaining = dupMatches.filter((m) => m.id !== id)
      if (remaining.length === 0) closeDialog()
      else setDupMatches(remaining)
    } else {
      setIsDeletingId(id)
      try {
        await deleteExpense(id)
        setDeletedDbIds((prev) => new Set([...prev, id]))
        if (isFlagged) { closeDialog(); return }
        const remaining = dupMatches.filter((m) => m.id !== id)
        if (remaining.length === 0) closeDialog()
        else setDupMatches(remaining)
      } catch {
        toast.error('Failed to delete expense')
      } finally {
        setIsDeletingId(null)
      }
    }
  }

  if (mappedData.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">No expenses to preview.</p>
    )
  }

  return (
    <>
      {/* ── Bulk action bar ──────────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={removeSelected}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove {selectedIds.length}
            </Button>
          </div>
        </div>
      )}

      {/* ── Mobile card list (< md) ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 md:hidden">
        {/* Select-all bar */}
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
          <span className="text-xs text-muted-foreground">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
          </span>
        </div>

        {mappedData.map((expense) => {
          const isDuplicate = duplicateMap.has(expense.id)
          const isSelected = selected.has(expense.id)
          return (
            <div
              key={expense.id}
              className={[
                'relative rounded-xl border bg-card px-4 py-3 transition-colors',
                isSelected
                  ? 'border-blue-400/60 bg-blue-50/40 dark:border-blue-500/40 dark:bg-blue-950/20'
                  : isDuplicate
                    ? 'border-amber-300/60 dark:border-amber-600/40'
                    : 'border-border',
              ].join(' ')}
            >
              {/* Row 1: checkbox + description + amount + delete */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleOne(expense.id)}
                    aria-label="Select expense"
                  />
                </div>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {isDuplicate && (
                      <button
                        type="button"
                        title="Possible duplicate — click to review"
                        aria-label="Possible duplicate"
                        className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-amber-500 transition-colors hover:text-amber-600"
                        onClick={() => {
                          setDupFlagged(importToEntry(expense))
                          setDupMatches(getMatches(expense.id))
                          setDupOpen(true)
                        }}
                      >
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      </button>
                    )}
                    <span className="truncate text-sm font-medium">
                      {expense.description || <span className="italic text-muted-foreground">No description</span>}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={[
                      'text-sm font-semibold tabular-nums',
                      expense.amount < 0 ? 'text-emerald-600 dark:text-emerald-400' : '',
                    ].join(' ')}>
                      {formatCurrency(expense.amount, currency, locale)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRow(expense.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: meta */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-7 text-[11px] text-muted-foreground">
                <span>{expense.date}</span>
                {expense.categoryName && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span>{expense.categoryName}</span>
                  </>
                )}
                {expense.locationName && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span>{expense.locationName}</span>
                  </>
                )}
                {expense.paidByName && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span>{expense.paidByName}</span>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Desktop table (≥ md) ─────────────────────────────────────────────── */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
              <th className="w-10 px-3 py-2.5 text-left">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </th>
              <th className="px-3 py-2.5 text-left font-medium">Date</th>
              <th className="px-3 py-2.5 text-left font-medium">Description</th>
              <th className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th className="px-3 py-2.5 text-left font-medium">Category</th>
              <th className="px-3 py-2.5 text-left font-medium">Location</th>
              <th className="px-3 py-2.5 text-left font-medium">Paid By</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {mappedData.map((expense) => {
              const isSelected = selected.has(expense.id)
              return (
                <tr
                  key={expense.id}
                  className={[
                    'border-b last:border-0 transition-colors',
                    isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-muted/30',
                  ].join(' ')}
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(expense.id)}
                      aria-label="Select row"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{expense.date}</td>
                  <td className="max-w-48 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {duplicateMap.has(expense.id) && (
                        <button
                          type="button"
                          title="Possible duplicate — click to review"
                          aria-label="Possible duplicate — click to review"
                          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-amber-500 transition-colors duration-150 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                          onClick={() => {
                            setDupFlagged(importToEntry(expense))
                            setDupMatches(getMatches(expense.id))
                            setDupOpen(true)
                          }}
                        >
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                      <span className="truncate">{expense.description || '—'}</span>
                    </div>
                  </td>
                  <td className={[
                    'whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums',
                    expense.amount < 0 ? 'text-emerald-600 dark:text-emerald-400' : '',
                  ].join(' ')}>
                    {formatCurrency(expense.amount, currency, locale)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{expense.categoryName ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{expense.locationName ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{expense.paidByName ?? '—'}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeRow(expense.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {dupFlagged && (
        <DuplicateExpenseDialog
          open={dupOpen}
          onOpenChange={(o) => { setDupOpen(o); if (!o) { setDupFlagged(null); setDupMatches([]) } }}
          flagged={dupFlagged}
          matches={dupMatches}
          currency={currency}
          locale={locale}
          onDelete={handleDeleteMatch}
          onKeepAll={closeDialog}
          isDeleting={!!isDeletingId}
        />
      )}
    </>
  )
}
