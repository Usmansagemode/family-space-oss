import {  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  
} from 'recharts'
import { formatCurrency, formatCurrencyCompact, parseLocalDate } from '#/lib/utils'
import { CHART_COLORS } from '#/lib/config'
import type { ExpenseWithNames } from '@family/types'

type Props = {
  expenses: ExpenseWithNames[]
  currency?: string
  locale?: string
}


function CustomTooltip({ active, payload, currency, locale }: { active?: boolean; payload?: Array<{ value?: number; name?: string; payload?: Record<string, unknown> }>; label?: string; currency?: string; locale?: string }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]?.payload as { label: string; amount: number }
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm max-w-[220px]">
      <p className="font-medium truncate">{entry?.label}</p>
      <p className="text-muted-foreground">
        {formatCurrency(entry?.amount ?? 0, currency, locale)}
      </p>
    </div>
  )
}

export function TopExpensesChart({ expenses, currency, locale }: Props) {
  const top10 = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map((e) => {
      const d = parseLocalDate(e.date)
      const dateStr = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
      const desc = e.description
        ? e.description.length > 18
          ? e.description.slice(0, 18) + '…'
          : e.description
        : '(No description)'
      return {
        label: `${desc} · ${dateStr}`,
        amount: e.amount,
      }
    })

  if (top10.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={top10}
        layout="vertical"
        margin={{ top: 4, right: 8, bottom: 0, left: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
        <XAxis
          type="number"
          tickFormatter={(v) => formatCurrencyCompact(v, currency, locale)}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip
          content={(props: any) => (
            <CustomTooltip {...props} currency={currency} locale={locale} />
          )}
        />
        <Bar
          dataKey="amount"
          fill={CHART_COLORS[3]}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
