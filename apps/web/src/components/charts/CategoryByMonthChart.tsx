import {  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  
} from 'recharts'
import { formatCurrency, formatCurrencyCompact } from '#/lib/utils'
import { CHART_COLORS } from '#/lib/config'
import type { ExpenseWithNames } from '@family/types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const FALLBACK_COLOR = CHART_COLORS[0]

type Props = {
  expenses: ExpenseWithNames[]
  currency?: string
  locale?: string
}


function CustomTooltip({ active, payload, label, currency, locale }: { active?: boolean; payload?: Array<{ value?: number; name?: string; payload?: Record<string, unknown> }>; label?: string; currency?: string; locale?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm min-w-[140px]">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ background: (p as any).color }}
            />
            {p.name}
          </span>
          <span className="font-medium tabular-nums">
            {formatCurrency(p.value ?? 0, currency, locale)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function CategoryByMonthChart({ expenses, currency, locale }: Props) {
  // Collect unique categories
  const categoryMap = new Map<string, { name: string; color: string }>()
  for (const e of expenses) {
    if (e.categoryId && !categoryMap.has(e.categoryId)) {
      categoryMap.set(e.categoryId, {
        name: e.categoryName ?? '(Uncategorized)',
        color: e.categoryColor ?? FALLBACK_COLOR,
      })
    }
  }
  if (!categoryMap.size) {
    // Still show uncategorized if any
    categoryMap.set('__none__', {
      name: '(Uncategorized)',
      color: FALLBACK_COLOR,
    })
  }

  const categories = [...categoryMap.entries()]

  const data = MONTHS.map((name, i) => {
    const monthNum = i + 1
    const row: Record<string, number | string> = { month: name }
    for (const [catId, catInfo] of categories) {
      row[catInfo.name] = expenses
        .filter((e) => {
          const m = parseInt(e.date.slice(5, 7), 10)
          const eKey = e.categoryId ?? '__none__'
          return m === monthNum && eKey === catId
        })
        .reduce((sum, e) => sum + e.amount, 0)
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
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
            <CustomTooltip {...props} currency={currency} locale={locale} />
          )}
        />
        <Legend />
        {categories.map(([, catInfo]) => (
          <Bar
            key={catInfo.name}
            dataKey={catInfo.name}
            stackId="categories"
            fill={catInfo.color}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
