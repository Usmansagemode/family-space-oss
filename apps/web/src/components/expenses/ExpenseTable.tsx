import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw, Trash2 } from 'lucide-react'
import { detectDuplicates } from '#/lib/duplicate-detection'
import type { DuplicateEntry } from '#/components/expenses/DuplicateExpenseDialog'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { BulkEditBar } from '#/components/expenses/BulkEditBar'
import { formatCurrency, parseLocalDate } from '#/lib/utils'
import { cn } from '#/lib/utils'
import type { Category, Space, ExpenseWithNames } from '@family/types'

type SortField = 'date' | 'amount' | 'description' | 'category' | 'location' | 'paidBy'
type SortDir = 'asc' | 'desc'

type Patch = {
  categoryId?: string | null
  locationId?: string | null
  paidById?: string | null
  description?: string
  date?: string
  amount?: number
}

type Props = {
  expenses: ExpenseWithNames[]
  categories: Category[]
  locationSpaces: Space[]
  personSpaces: Space[]
  familyId: string
  currency?: string
  locale?: string
  onEdit: (expense: ExpenseWithNames) => void
  onDelete: (id: string) => void
  onDeleteMany: (ids: string[]) => void
  onBulkUpdate: (ids: string[], patch: Patch) => void
  onClickRecurring?: (recurringTransactionId: string) => void
  onFlagClick?: (flagged: DuplicateEntry, matches: DuplicateEntry[]) => void
  showDuplicates?: boolean
}

export function ExpenseTable({
  expenses,
  categories,
  locationSpaces,
  personSpaces,
  currency,
  locale,
  onEdit,
  onDelete,
  onDeleteMany,
  onBulkUpdate,
  onClickRecurring,
  onFlagClick,
  showDuplicates = false,
}: Props) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  const duplicateMap = useMemo(
    () => showDuplicates ? detectDuplicates(expenses) : new Map(),
    [expenses, showDuplicates],
  )

  const sorted = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'date') return a.date.localeCompare(b.date) * dir
      if (sortField === 'amount') return (a.amount - b.amount) * dir
      const strA = (
        sortField === 'description' ? a.description :
        sortField === 'category' ? a.categoryName :
        sortField === 'location' ? a.locationName :
        a.paidByName
      ) ?? null
      const strB = (
        sortField === 'description' ? b.description :
        sortField === 'category' ? b.categoryName :
        sortField === 'location' ? b.locationName :
        b.paidByName
      ) ?? null
      if (strA === null && strB === null) return 0
      if (strA === null) return 1
      if (strB === null) return -1
      return strA.localeCompare(strB) * dir
    })
  }, [expenses, sortField, sortDir])

  const allSelected = sorted.length > 0 && sorted.every((e) => selected.has(e.id))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(sorted.map((e) => e.id)))
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedIds = [...selected]

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    if (sortDir === 'asc') return <ArrowUp className="h-3 w-3" />
    return <ArrowDown className="h-3 w-3" />
  }

  if (expenses.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed py-16 text-sm text-muted-foreground">
        No expenses this month. Add one to get started.
      </div>
    )
  }

  // ─── shared helper to build DuplicateEntry ────────────────────────────────
  function toEntry(ex: ExpenseWithNames, reason?: DuplicateEntry['reason']): DuplicateEntry {
    return {
      id: ex.id, date: ex.date, amount: ex.amount,
      description: ex.description, categoryName: ex.categoryName,
      categoryColor: ex.categoryColor, locationName: ex.locationName,
      paidByName: ex.paidByName, source: 'db', reason,
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedIds.length > 0 && (
        <BulkEditBar
          selectedCount={selectedIds.length}
          categories={categories}
          locationSpaces={locationSpaces}
          personSpaces={personSpaces}
          onApply={(patch) => { onBulkUpdate(selectedIds, patch); setSelected(new Set()) }}
          onDelete={() => { onDeleteMany(selectedIds); setSelected(new Set()) }}
          onClear={() => setSelected(new Set())}
        />
      )}

      {/* ── Mobile card list (< md) ───────────────────────────────────────── */}
      <div className="flex flex-col gap-2 md:hidden">
        {/* Mobile sort + select-all bar */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
            <span className="text-xs text-muted-foreground">
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Sort:</span>
            {(['date', 'amount'] as const).map((f) => (
              <button
                key={f}
                onClick={() => toggleSort(f)}
                className={cn(
                  'flex items-center gap-0.5 rounded px-2 py-1 text-xs font-medium transition-colors',
                  sortField === f
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f === 'date' ? 'Date' : 'Amount'}
                {sortField === f && (sortDir === 'asc'
                  ? <ArrowUp className="h-2.5 w-2.5" />
                  : <ArrowDown className="h-2.5 w-2.5" />)}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <AnimatePresence initial={false}>
          {sorted.map((expense, i) => {
            const isSelected = selected.has(expense.id)
            const d = parseLocalDate(expense.date)
            const isDuplicate = duplicateMap.has(expense.id)
            const categoryColor = expense.categoryColor ?? null

            return (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.18, delay: i * 0.025, ease: 'easeOut' }}
                onClick={() => onEdit(expense)}
                className={cn(
                  'group relative cursor-pointer overflow-hidden rounded-xl border bg-card transition-all duration-150',
                  'hover:border-border/80 hover:shadow-sm',
                  isSelected
                    ? 'border-blue-400/60 bg-blue-50/40 shadow-sm dark:border-blue-500/40 dark:bg-blue-950/20'
                    : 'border-border',
                  isDuplicate && 'border-amber-300/60 dark:border-amber-600/40',
                )}
              >
                {/* Category color accent bar */}
                {categoryColor && (
                  <div
                    className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
                    style={{ background: categoryColor }}
                  />
                )}

                <div className="flex items-start gap-3 py-3 pl-4 pr-3" style={{ paddingLeft: categoryColor ? 14 : 12 }}>
                  {/* Checkbox */}
                  <div
                    className="mt-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(expense.id)}
                      aria-label="Select expense"
                    />
                  </div>

                  {/* Main content */}
                  <div className="min-w-0 flex-1">
                    {/* Row 1: description + amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {/* Icons */}
                        {expense.autoGenerated && (
                          expense.recurringTransactionId && onClickRecurring ? (
                            <button
                              type="button"
                              title="Auto-generated from recurring transaction"
                              className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
                              onClick={(e) => { e.stopPropagation(); onClickRecurring(expense.recurringTransactionId!) }}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          ) : (
                            <RefreshCw className="h-3 w-3 shrink-0 text-muted-foreground/40" title="Auto-generated" />
                          )
                        )}
                        {isDuplicate && onFlagClick && (
                          <button
                            type="button"
                            title="Possible duplicate — click to review"
                            aria-label="Possible duplicate"
                            className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-amber-500 hover:text-amber-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              const matchEntries = duplicateMap.get(expense.id)!
                              const matches = matchEntries
                                .map(({ id, reason }) => {
                                  const ex = expenses.find((e) => e.id === id)
                                  return ex ? toEntry(ex, reason) : null
                                })
                                .filter(Boolean) as DuplicateEntry[]
                              onFlagClick(toEntry(expense), matches)
                            }}
                          >
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          </button>
                        )}
                        <span className={cn(
                          'block truncate text-sm font-medium',
                          !expense.description && 'italic text-muted-foreground font-normal',
                        )}>
                          {expense.description ?? 'No description'}
                        </span>
                      </div>
                      <span className={cn(
                        'shrink-0 text-sm font-semibold tabular-nums',
                        expense.amount < 0 && 'text-emerald-600 dark:text-emerald-400',
                      )}>
                        {formatCurrency(expense.amount, currency, locale)}
                      </span>
                    </div>

                    {/* Row 2: meta pills + date */}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-1">
                        {expense.categoryName && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
                            style={{
                              background: categoryColor ? `${categoryColor}22` : 'var(--muted)',
                              color: categoryColor ?? 'var(--muted-foreground)',
                            }}
                          >
                            {categoryColor && (
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ background: categoryColor }}
                              />
                            )}
                            {expense.categoryName}
                          </span>
                        )}
                        {expense.locationName && (
                          <span className="truncate text-[11px] text-muted-foreground">
                            {expense.locationName}
                          </span>
                        )}
                        {expense.paidByName && (
                          <>
                            {expense.locationName && (
                              <span className="text-[11px] text-muted-foreground/40">·</span>
                            )}
                            <span className="truncate text-[11px] text-muted-foreground">
                              {expense.paidByName}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Delete */}
                  <div
                    className="mt-0.5 shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(expense.id)}
                      aria-label="Delete expense"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* ── Desktop table (≥ md) ──────────────────────────────────────────── */}
      <div className="hidden rounded-lg border md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </th>
              {(
                [
                  { field: 'date', label: 'Date', align: 'left' },
                  { field: 'description', label: 'Description', align: 'left' },
                  { field: 'amount', label: 'Amount', align: 'right' },
                  { field: 'category', label: 'Category', align: 'left' },
                  { field: 'location', label: 'Location', align: 'left' },
                  { field: 'paidBy', label: 'Paid by', align: 'left' },
                ] as { field: SortField; label: string; align: 'left' | 'right' }[]
              ).map(({ field, label, align }) => (
                <th key={field} className={cn('px-4 py-3', align === 'right' ? 'text-right' : 'text-left')}>
                  <button
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium text-muted-foreground',
                      align === 'right' && 'ml-auto',
                    )}
                    onClick={() => toggleSort(field)}
                  >
                    {label} <SortIcon field={field} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((expense) => {
              const isSelected = selected.has(expense.id)
              const d = parseLocalDate(expense.date)
              return (
                <tr
                  key={expense.id}
                  onClick={() => onEdit(expense)}
                  className={cn(
                    'border-b last:border-0 transition-colors hover:bg-muted/20 cursor-pointer',
                    isSelected && 'bg-blue-50/50 dark:bg-blue-950/20',
                  )}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(expense.id)} aria-label="Select row" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                    {d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="max-w-[200px] px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {expense.autoGenerated && (
                        expense.recurringTransactionId && onClickRecurring ? (
                          <button
                            type="button"
                            title="Auto-generated from recurring transaction — click to edit"
                            className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
                            onClick={(e) => { e.stopPropagation(); onClickRecurring(expense.recurringTransactionId!) }}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        ) : (
                          <span title="Auto-generated (template deleted)">
                            <RefreshCw className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                          </span>
                        )
                      )}
                      {duplicateMap.has(expense.id) && onFlagClick && (
                        <button
                          type="button"
                          title="Possible duplicate — click to review"
                          aria-label="Possible duplicate — click to review"
                          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-amber-500 transition-colors duration-150 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                          onClick={(e) => {
                            e.stopPropagation()
                            const matchEntries = duplicateMap.get(expense.id)!
                            const matches = matchEntries
                              .map(({ id, reason }) => {
                                const ex = expenses.find((e) => e.id === id)
                                return ex ? toEntry(ex, reason) : null
                              })
                              .filter(Boolean) as DuplicateEntry[]
                            onFlagClick(toEntry(expense), matches)
                          }}
                        >
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                      {expense.description
                        ? <span className="block truncate">{expense.description}</span>
                        : <span className="italic text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className={cn(
                    'whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums',
                    expense.amount < 0 && 'text-emerald-600 dark:text-emerald-400',
                  )}>
                    {formatCurrency(expense.amount, currency, locale)}
                  </td>
                  <td className="px-4 py-3">
                    {expense.categoryName ? (
                      <div className="flex items-center gap-1.5">
                        {expense.categoryColor && (
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: expense.categoryColor }}
                          />
                        )}
                        <span className="text-sm">{expense.categoryName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{expense.locationName ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{expense.paidByName ?? '—'}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => onDelete(expense.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
