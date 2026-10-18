import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn, formatCurrency } from '#/lib/utils'
import { getCategoryIcon } from '#/lib/categoryIcons'
import type { Category, Space, ExpenseWithNames } from '@family/types'

type Props = {
  expenses: ExpenseWithNames[]
  categories: Category[]
  personSpaces: Space[]
  prevTotal?: number
  currency?: string
  locale?: string
}

export function ExpenseSummary({ expenses, categories, personSpaces, prevTotal, currency, locale }: Props) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  const deltaPercent = prevTotal != null && prevTotal > 0
    ? ((total - prevTotal) / prevTotal) * 100
    : null

  // Category breakdown
  const categoryTotals = new Map<string, { name: string; color: string | null; icon: string | null; total: number; count: number }>()
  for (const e of expenses) {
    const key = e.categoryId ?? '__none__'
    const cat = categories.find((c) => c.id === e.categoryId)
    const existing = categoryTotals.get(key)
    if (existing) {
      existing.total += e.amount
      existing.count++
    } else {
      categoryTotals.set(key, {
        name: e.categoryName ?? '(Uncategorized)',
        color: cat?.color ?? null,
        icon: cat?.icon ?? null,
        total: e.amount,
        count: 1,
      })
    }
  }
  const topCategories = [...categoryTotals.values()].sort((a, b) => b.total - a.total).slice(0, 5)
  const maxCatTotal = topCategories[0]?.total ?? 1

  // Member breakdown
  const memberTotals = new Map<string, { name: string; color: string | null; total: number }>()
  for (const e of expenses) {
    const key = e.paidById ?? '__none__'
    const space = personSpaces.find((s) => s.id === e.paidById)
    const existing = memberTotals.get(key)
    if (existing) {
      existing.total += e.amount
    } else {
      memberTotals.set(key, {
        name: e.paidByName ?? '(Unknown)',
        color: space?.color ?? null,
        total: e.amount,
      })
    }
  }
  const members = [...memberTotals.values()].sort((a, b) => b.total - a.total)
  const maxMemberTotal = members[0]?.total ?? 1

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Total */}
      <div className="rounded-xl border bg-card px-5 py-4">
        <p className="text-xs font-medium text-muted-foreground">Total Spent</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {formatCurrency(total, currency, locale)}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <p className="text-xs text-muted-foreground">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
          </p>
          {deltaPercent != null && (
            <span
              className={cn(
                'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                deltaPercent > 0
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              )}
            >
              {deltaPercent > 0
                ? <TrendingUp className="h-2.5 w-2.5" />
                : <TrendingDown className="h-2.5 w-2.5" />}
              {Math.abs(deltaPercent).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="rounded-xl border bg-card px-5 py-4">
        <p className="text-xs font-medium text-muted-foreground">By Category</p>
        {topCategories.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No data</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {topCategories.map((c) => {
              const Icon = getCategoryIcon(c.icon)
              const pct = (c.total / maxCatTotal) * 100
              return (
                <li key={c.name}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm"
                        style={{ background: c.color ? c.color + '26' : undefined }}
                      >
                        <Icon className="h-2.5 w-2.5" style={{ color: c.color ?? undefined }} />
                      </span>
                      <span className="truncate text-xs">{c.name}</span>
                    </div>
                    <span className="shrink-0 text-xs font-medium tabular-nums">
                      {formatCurrency(c.total, currency, locale)}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: c.color ?? 'var(--primary)',
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* By member */}
      <div className="rounded-xl border bg-card px-5 py-4">
        <p className="text-xs font-medium text-muted-foreground">By Member</p>
        {members.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No data</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {members.map((m) => {
              const pct = (m.total / maxMemberTotal) * 100
              return (
                <li key={m.name}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {m.color && (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: m.color }}
                        />
                      )}
                      <span className="truncate text-xs">{m.name}</span>
                    </div>
                    <span className="shrink-0 text-xs font-medium tabular-nums">
                      {formatCurrency(m.total, currency, locale)}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: m.color ?? 'var(--primary)',
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
