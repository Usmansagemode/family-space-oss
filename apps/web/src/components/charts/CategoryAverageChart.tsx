import {  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  
} from 'recharts'
import { formatCurrency, formatCurrencyCompact } from '#/lib/utils'
import { CHART_COLORS } from '#/lib/config'
import type { ExpenseWithNames } from '@family/types'

const FALLBACK_COLOR = CHART_COLORS[0]

type Props = {
  expenses: ExpenseWithNames[]
  currency?: string
  locale?: string
}


function CustomTooltip({ active, payload, currency, locale }: { active?: boolean; payload?: Array<{ value?: number; name?: string; payload?: Record<string, unknown> }>; label?: string; currency?: string; locale?: string }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]?.payload as { category: string; avg: number; count: number }
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{entry?.category}</p>
      <p className="text-muted-foreground">
        Avg: {formatCurrency(entry?.avg ?? 0, currency, locale)}
      </p>
      <p className="text-xs text-muted-foreground">{entry?.count} transaction{entry?.count !== 1 ? 's' : ''}</p>
    </div>
  )
}

export function CategoryAverageChart({ expenses, currency, locale }: Props) {
  const totals = new Map<
    string,
    { category: string; total: number; count: number; color: string }
  >()

  for (const e of expenses) {
    const key = e.categoryId ?? '__none__'
    const name = e.categoryName ?? '(Uncategorized)'
    const color = e.categoryColor ?? FALLBACK_COLOR
    const existing = totals.get(key)
    if (existing) {
      existing.total += e.amount
      existing.count += 1
    } else {
      totals.set(key, { category: name, total: e.amount, count: 1, color })
    }
  }

  const data = [...totals.values()]
    .map((d) => ({ ...d, avg: d.total / d.count }))
    .sort((a, b) => b.avg - a.avg)

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
        No data
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
          dataKey="category"
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
        <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? FALLBACK_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
