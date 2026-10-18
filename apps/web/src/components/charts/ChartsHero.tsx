import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ExpenseWithNames } from '@family/types'
import { formatCurrency, formatCurrencyCompact } from '#/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

type Props = {
  expenses: ExpenseWithNames[]
  fullYearExpenses: ExpenseWithNames[]
  currency?: string
  locale?: string
  year: number
  selectedMonths?: number[]
}

function HeroTooltip({
  active,
  payload,
  label,
  currency,
  locale,
}: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
  currency?: string
  locale?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">{formatCurrency(payload[0]?.value ?? 0, currency, locale)}</p>
    </div>
  )
}

export function ChartsHero({ expenses, fullYearExpenses, currency, locale, year, selectedMonths }: Props) {
  const now = new Date()

  // When a single month is filtered, use it as the focus month.
  // Otherwise fall back to the current calendar month (or Dec for past years).
  const isSingleMonth = selectedMonths?.length === 1
  const focusMonthIndex = isSingleMonth
    ? selectedMonths![0]!
    : now.getFullYear() === year ? now.getMonth() : 11 // 0-indexed
  const focusLabel = isSingleMonth
    ? (MONTH_NAMES[focusMonthIndex] ?? 'This Month')
    : 'This Month'

  const monthlyData = useMemo(
    () =>
      MONTHS.map((month, i) => {
        const monthNum = i + 1
        const total = fullYearExpenses
          .filter((e) => parseInt(e.date.slice(5, 7), 10) === monthNum)
          .reduce((sum, e) => sum + e.amount, 0)
        return { month, total }
      }),
    [fullYearExpenses],
  )

  const ytdTotal = useMemo(
    () => fullYearExpenses.reduce((sum, e) => sum + e.amount, 0),
    [fullYearExpenses],
  )

  const focusMonthTotal = useMemo(
    () =>
      expenses
        .filter((e) => parseInt(e.date.slice(5, 7), 10) === focusMonthIndex + 1)
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, focusMonthIndex],
  )

  const monthsWithData = monthlyData.filter((d) => d.total > 0).length
  const avgPerMonth = monthsWithData > 0 ? ytdTotal / monthsWithData : 0

  const stats = [
    { label: `${year} Total`, value: ytdTotal },
    { label: focusLabel, value: focusMonthTotal },
    { label: 'Monthly Avg', value: avgPerMonth },
  ]

  return (
    <div className="mb-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-xl border px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {s.label}
            </p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatCurrency(s.value, currency, locale)}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border px-5 pb-5 pt-4">
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          Monthly Spending — {year}
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="hero-area-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatCurrencyCompact(v, currency, locale)}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              content={(props: any) => (
                <HeroTooltip {...props} currency={currency} locale={locale} />
              )}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--primary)"
              fill="url(#hero-area-gradient)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
