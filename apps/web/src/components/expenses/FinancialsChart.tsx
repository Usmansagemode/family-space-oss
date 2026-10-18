import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts'
import { useYearlyExpenses, useYearlyIncome } from '#/hooks/useYearlyFinancials'
import { useBudgets } from '#/hooks/budgets/useBudgets'
import { formatCurrencyCompact, formatCurrency } from '#/lib/utils'
import type { Budget } from '@family/types'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type Props = {
  familyId: string
  year: number
  currentMonth: number // 1-based
  currency?: string
  locale?: string
}

function monthlyBudgetTotal(budgets: Budget[]): number {
  return budgets.reduce((sum, b) => {
    const monthly = b.period === 'monthly' ? b.amount : b.amount / 12
    return sum + monthly
  }, 0)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, currency, locale }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5 shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto font-semibold tabular-nums">
            {formatCurrency(entry.value, currency, locale)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function FinancialsChart({ familyId, year, currentMonth, currency, locale }: Props) {
  const { data: expenses } = useYearlyExpenses(familyId, year)
  const { data: incomeEntries } = useYearlyIncome(familyId, year)
  const { data: budgets } = useBudgets(familyId)

  const monthlyBudget = useMemo(() => monthlyBudgetTotal(budgets ?? []), [budgets])

  const chartData = useMemo(() => {
    return MONTH_LABELS.slice(0, currentMonth).map((label, i) => {
      const m = i + 1

      const expTotal = (expenses ?? [])
        .filter((e) => {
          const em = parseInt(e.date.slice(5, 7), 10)
          return em === m
        })
        .reduce((sum, e) => sum + e.amount, 0)

      const incTotal = (incomeEntries ?? [])
        .filter((e) => {
          const em = parseInt(e.date.slice(5, 7), 10)
          return em === m
        })
        .reduce((sum, e) => sum + e.amount, 0)

      return {
        month: label,
        Income: incTotal,
        Expenses: expTotal,
        Budget: monthlyBudget > 0 ? monthlyBudget : undefined,
      }
    })
  }, [expenses, incomeEntries, monthlyBudget, currentMonth])

  const hasData = chartData.some((d) => d.Income > 0 || d.Expenses > 0)

  if (!hasData) return null

  const allValues = chartData.flatMap((d) => [d.Income, d.Expenses, d.Budget ?? 0].filter(Boolean))
  const maxVal = Math.max(...allValues)
  const yMax = Math.ceil(maxVal * 1.15 / 100) * 100

  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Income vs Expenses</p>
          <p className="text-xs text-muted-foreground">{year} · month by month</p>
        </div>
        {monthlyBudget > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/60 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-400">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-current" />
            Budget {formatCurrencyCompact(monthlyBudget)}/mo
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="expensesGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} vertical={false} />

          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatCurrencyCompact(v)}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={52}
            domain={[0, yMax]}
          />

          <Tooltip
            content={<CustomTooltip currency={currency} locale={locale} />}
            cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
          />

          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 12, color: 'var(--muted-foreground)' }}
          />

          {monthlyBudget > 0 && (
            <ReferenceLine
              y={monthlyBudget}
              stroke="#3b82f6"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={false}
            />
          )}

          <Line
            type="monotone"
            dataKey="Income"
            stroke="url(#incomeGrad)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#10b981' }}
          />
          <Line
            type="monotone"
            dataKey="Expenses"
            stroke="url(#expensesGrad)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#f43f5e' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
