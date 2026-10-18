import {  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  
} from 'recharts'
import { formatCurrency } from '#/lib/utils'
import type { ExpenseWithNames } from '@family/types'
import { CHART_COLORS } from '#/lib/config'

const COLORS = [...CHART_COLORS]

type Props = {
  expenses: ExpenseWithNames[]
  currency?: string
  locale?: string
}


function CustomTooltip({ active, payload, currency, locale }: { active?: boolean; payload?: Array<{ value?: number; name?: string; payload?: Record<string, unknown> }>; label?: string; currency?: string; locale?: string }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{entry?.name}</p>
      <p className="text-muted-foreground">
        {formatCurrency(entry?.value ?? 0, currency, locale)}
      </p>
    </div>
  )
}

export function MemberSpendingChart({ expenses, currency, locale }: Props) {
  const totals = new Map<string, { name: string; value: number }>()

  for (const e of expenses) {
    const key = e.paidById ?? '__none__'
    const name = e.paidByName ?? '(Unknown member)'
    const existing = totals.get(key)
    if (existing) {
      existing.value += e.amount
    } else {
      totals.set(key, { name, value: e.amount })
    }
  }

  const data = [...totals.values()].sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="45%"
          outerRadius={90}
          label={({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={(props: any) => (
            <CustomTooltip {...props} currency={currency} locale={locale} />
          )}
        />
        <Legend
          formatter={(value) => {
            const entry = data.find((d) => d.name === value)
            const pct = entry ? ((entry.value / total) * 100).toFixed(1) : '0'
            return `${value} (${pct}%)`
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
