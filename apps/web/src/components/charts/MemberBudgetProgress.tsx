import type { Budget, ExpenseWithNames, Space } from '@family/types'
import { cn, formatCurrency } from '#/lib/utils'

interface MemberBudgetProgressProps {
  budgets: Budget[]
  expenses: ExpenseWithNames[]
  spaces: Space[]
  currency?: string
  locale?: string
  year: number
  selectedMonths?: number[]
}

export function MemberBudgetProgress({
  budgets,
  expenses,
  spaces,
  currency,
  locale,
  year,
  selectedMonths,
}: MemberBudgetProgressProps) {
  // Only per-member overall budgets (no category filter)
  const memberBudgets = budgets.filter((b) => b.personId !== null && b.categoryId === null)

  if (memberBudgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">No member budgets set.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Go to Settings → Members → expand a member to set their spending budget.
        </p>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  // If a single month is filtered, use that as the focus month; otherwise use today's month
  const focusMonth = selectedMonths?.length === 1
    ? selectedMonths[0]! + 1  // convert 0-indexed to 1-indexed
    : new Date().getMonth() + 1 // 1–12
  const focusMonthLabel = selectedMonths?.length === 1
    ? ['January','February','March','April','May','June','July','August','September','October','November','December'][selectedMonths[0]!] ?? 'This month'
    : 'This month'

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {memberBudgets.map((budget) => {
        const space = spaces.find((s) => s.id === budget.personId)
        if (!space) return null

        const memberExpenses = expenses.filter((e) => e.paidById === budget.personId)

        // Year-to-date actual
        const ytdActual = memberExpenses.reduce((sum, e) => sum + e.amount, 0)

        // Normalise budget to yearly for the YTD comparison
        const yearlyLimit = budget.period === 'monthly' ? budget.amount * 12 : budget.amount

        const ytdPct = yearlyLimit > 0 ? (ytdActual / yearlyLimit) * 100 : 0
        const ytdOver = ytdActual > yearlyLimit

        // Monthly comparison — only relevant when budget is monthly and viewing current year
        const showMonthly = budget.period === 'monthly' && year === currentYear
        const monthActual = showMonthly
          ? memberExpenses
              .filter((e) => parseInt(e.date.slice(5, 7), 10) === focusMonth)
              .reduce((sum, e) => sum + e.amount, 0)
          : 0
        const monthPct = showMonthly && budget.amount > 0 ? (monthActual / budget.amount) * 100 : 0
        const monthOver = monthActual > budget.amount

        return (
          <div
            key={budget.id}
            className="flex flex-col gap-3 rounded-xl border bg-card px-5 pb-5 pt-4"
          >
            {/* Member name */}
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">{space.name}</p>
              <span className="text-[10px] text-muted-foreground">
                {formatCurrency(budget.amount, currency, locale)}/{budget.period}
              </span>
            </div>

            {/* Year total bar */}
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">{year} total</span>
                <span className={cn('font-medium', ytdOver ? 'text-destructive' : '')}>
                  {formatCurrency(ytdActual, currency, locale)}
                  <span className="ml-1 font-normal text-muted-foreground">
                    / {formatCurrency(yearlyLimit, currency, locale)}
                  </span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    ytdOver
                      ? 'bg-destructive'
                      : ytdPct >= 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500',
                  )}
                  style={{ width: `${Math.min(ytdPct, 100)}%` }}
                />
              </div>
              <p className={cn('text-[10px]', ytdOver ? 'text-destructive' : 'text-muted-foreground')}>
                {ytdOver
                  ? `${formatCurrency(ytdActual - yearlyLimit, currency, locale)} over budget`
                  : `${formatCurrency(yearlyLimit - ytdActual, currency, locale)} remaining`}
              </p>
            </div>

            {/* This month bar — only for monthly budgets in current year */}
            {showMonthly && (
              <div className="flex flex-col gap-1 border-t border-border pt-3">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted-foreground">{focusMonthLabel}</span>
                  <span className={cn('font-medium', monthOver ? 'text-destructive' : '')}>
                    {formatCurrency(monthActual, currency, locale)}
                    <span className="ml-1 font-normal text-muted-foreground">
                      / {formatCurrency(budget.amount, currency, locale)}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      monthOver
                        ? 'bg-destructive'
                        : monthPct >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500',
                    )}
                    style={{ width: `${Math.min(monthPct, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
