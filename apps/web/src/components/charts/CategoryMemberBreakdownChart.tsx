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
import type { ExpenseWithNames } from '@family/types'
import { CHART_COLORS } from '#/lib/config'

const MEMBER_COLORS = [...CHART_COLORS]

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

export function CategoryMemberBreakdownChart({ expenses, currency, locale }: Props) {
  // Collect unique members and categories
  const members = new Map<string, string>()
  const categories = new Map<string, string>()

  for (const e of expenses) {
    members.set(e.paidById ?? '__none__', e.paidByName ?? '(Unknown member)')
    categories.set(e.categoryId ?? '__none__', e.categoryName ?? '(Uncategorized)')
  }

  const memberList = [...members.entries()]
  const categoryList = [...categories.entries()]

  // Build data: one bar group per category, stacked/grouped by member
  const data = categoryList.map(([catId, catName]) => {
    const row: Record<string, number | string> = { category: catName }
    for (const [memberKey, memberName] of memberList) {
      row[memberName] = expenses
        .filter(
          (e) =>
            (e.categoryId ?? '__none__') === catId &&
            (e.paidById ?? '__none__') === memberKey,
        )
        .reduce((sum, e) => sum + e.amount, 0)
    }
    return row
  })

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
        No data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
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
        <Legend />
        {memberList.map(([, memberName], i) => (
          <Bar
            key={memberName}
            dataKey={memberName}
            stackId="members"
            fill={MEMBER_COLORS[i % MEMBER_COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
