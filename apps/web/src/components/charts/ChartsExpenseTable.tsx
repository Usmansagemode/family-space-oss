import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { ExpenseWithNames } from '@family/types'
import { cn } from '#/lib/utils'
import { formatCurrency, parseLocalDate } from '#/lib/utils'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

interface ChartsExpenseTableProps {
  expenses: ExpenseWithNames[]
  currency?: string
  locale?: string
}

export function ChartsExpenseTable({ expenses, currency, locale }: ChartsExpenseTableProps) {
  // Build month buckets: mm string → expenses[]
  const monthBuckets = useMemo(() => {
    const buckets = new Map<string, ExpenseWithNames[]>()
    for (const e of expenses) {
      const mm = e.date.slice(5, 7)
      const existing = buckets.get(mm)
      if (existing) {
        existing.push(e)
      } else {
        buckets.set(mm, [e])
      }
    }
    return buckets
  }, [expenses])

  // Default selected month: month of the most recent expense (lexicographic sort on date string)
  const defaultMonth = useMemo(() => {
    if (expenses.length === 0) return null
    const latest = expenses.reduce((best, e) => (e.date > best.date ? e : best))
    return latest.date.slice(5, 7)
  }, [expenses])

  const [selectedMonth, setSelectedMonth] = useState<string | null>(defaultMonth)

  // When expenses change (e.g. year changes), if the selected month has no data and there is
  // a default, reset to the default so the table doesn't show an empty state unnecessarily.
  const activeMonth = selectedMonth !== null && monthBuckets.has(selectedMonth)
    ? selectedMonth
    : defaultMonth

  const rows = useMemo(() => {
    if (activeMonth === null) return []
    const bucket = monthBuckets.get(activeMonth) ?? []
    // Sort date descending — lexicographic string compare, no new Date()
    return [...bucket].sort((a, b) => b.date.localeCompare(a.date))
  }, [monthBuckets, activeMonth])

  const monthTotal = useMemo(
    () => rows.reduce((sum, e) => sum + e.amount, 0),
    [rows],
  )

  // Empty state when there are no expenses at all
  if (expenses.length === 0) {
    return (
      <div className="print:hidden bg-card rounded-xl border px-5 pb-5 pt-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Transactions</p>
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No expenses for the selected period
        </div>
      </div>
    )
  }

  return (
    <div className="print:hidden bg-card rounded-xl border px-5 pb-5 pt-4">
      <p className="mb-3 text-sm font-medium text-muted-foreground">Transactions</p>

      {/* Month navigation strip */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 pb-3" role="tablist" aria-label="Select month">
          {MONTH_NAMES.map((name, index) => {
            const mm = String(index + 1).padStart(2, '0')
            const hasExpenses = monthBuckets.has(mm)
            const isSelected = activeMonth === mm
            return (
              <button
                key={mm}
                role="tab"
                aria-selected={isSelected}
                aria-label={name}
                disabled={!hasExpenses}
                onClick={() => setSelectedMonth(mm)}
                className={cn(
                  'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'bg-foreground text-background'
                    : hasExpenses
                      ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      : 'cursor-not-allowed text-muted-foreground/30',
                )}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected-month subtitle */}
      {activeMonth !== null && (
        <p className="mb-3 text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'transaction' : 'transactions'} ·{' '}
          {formatCurrency(monthTotal, currency, locale)}
        </p>
      )}

      {/* Table or empty state */}
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          No expenses for this month
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Date
                </th>
                <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground">
                  Description
                </th>
                <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Category
                </th>
                <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Location
                </th>
                <th className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Paid By
                </th>
                <th className="pb-2 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((expense) => {
                const d = parseLocalDate(expense.date)
                return (
                  <tr
                    key={expense.id}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {d.toLocaleDateString(locale, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-2.5 pr-4 max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        {expense.recurringTransactionId !== null && (
                          <span title="Recurring transaction">
                            <RefreshCw className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                          </span>
                        )}
                        {expense.description ? (
                          <span className="truncate">{expense.description}</span>
                        ) : (
                          <span className="italic text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      {expense.categoryName ? (
                        <div className="flex items-center gap-1.5">
                          {expense.categoryColor && (
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: expense.categoryColor }}
                            />
                          )}
                          <span className="text-xs">{expense.categoryName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {expense.locationName ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {expense.paidByName ?? '—'}
                    </td>
                    <td
                      className={cn(
                        'py-2.5 text-right text-xs font-medium tabular-nums whitespace-nowrap',
                        expense.amount < 0 && 'text-emerald-600 dark:text-emerald-400',
                      )}
                    >
                      {formatCurrency(expense.amount, currency, locale)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
