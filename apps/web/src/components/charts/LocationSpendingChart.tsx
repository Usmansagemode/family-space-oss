import {  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  
} from 'recharts'
import { formatCurrency, formatCurrencyCompact } from '#/lib/utils'
import { CHART_COLORS } from '#/lib/config'
import type { ExpenseWithNames } from '@family/types'

type Props = {
  expenses: ExpenseWithNames[]
  currency?: string
  locale?: string
}


function CustomTooltip({ active, payload, currency, locale }: { active?: boolean; payload?: Array<{ value?: number; name?: string; payload?: Record<string, unknown> }>; label?: string; currency?: string; locale?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{payload[0]?.payload?.location as string}</p>
      <p className="text-muted-foreground">
        {formatCurrency(payload[0]?.value ?? 0, currency, locale)}
      </p>
    </div>
  )
}

export function LocationSpendingChart({ expenses, currency, locale }: Props) {
  const totals = new Map<string, { location: string; total: number }>()

  for (const e of expenses) {
    if (!e.locationId || !e.locationName) continue
    const key = e.locationId
    const name = e.locationName
    const existing = totals.get(key)
    if (existing) {
      existing.total += e.amount
    } else {
      totals.set(key, { location: name, total: e.amount })
    }
  }

  const data = [...totals.values()].sort((a, b) => b.total - a.total)

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-muted-foreground">
        {expenses.length > 0
          ? 'No expenses with a location in this period'
          : 'No data'}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
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
          dataKey="location"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={90}
        />
        <Tooltip
          content={(props: any) => (
            <CustomTooltip {...props} currency={currency} locale={locale} />
          )}
        />
        <Bar
          dataKey="total"
          fill={CHART_COLORS[1]}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
