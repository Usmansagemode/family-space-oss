import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts'
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { formatCurrency, formatCurrencyCompact } from '#/lib/utils'
import { CHART_COLORS } from '#/lib/config'
import type { ExpenseWithNames } from '@family/types'

// Pastel intensity colours: green = low spend, yellow = mid, coral = high
const GREEN  = CHART_COLORS[1]  // mint green
const ORANGE = CHART_COLORS[2]  // butter yellow
const RED    = CHART_COLORS[7]  // coral

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type Props = {
  expenses: ExpenseWithNames[]
  currency?: string
  locale?: string
}

function CustomTooltip({ active, payload, label, currency, locale }: {
  active?: boolean
  payload?: Array<{ value?: number; color?: string }>
  label?: string
  currency?: string
  locale?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {formatCurrency(payload[0]?.value ?? 0, currency, locale)}
      </p>
    </div>
  )
}

export function MonthlySpendingChart({ expenses, currency, locale }: Props) {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')

  const data = MONTHS.map((month, i) => {
    const monthNum = i + 1
    const total = expenses
      .filter((e) => parseInt(e.date.slice(5, 7), 10) === monthNum)
      .reduce((sum, e) => sum + e.amount, 0)
    return { month, total }
  })

  const maxTotal = Math.max(...data.map((d) => d.total), 0)

  function getBarColor(amount: number): string {
    if (maxTotal === 0) return GREEN
    const ratio = amount / maxTotal
    if (ratio < 0.33) return GREEN
    if (ratio < 0.66) return ORANGE
    return RED
  }

  return (
    <>
      <div className="flex items-center justify-end mb-2">
        <div
          className="bg-secondary flex gap-1 rounded-md p-1"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant={chartType === 'area' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChartType('area')}
            className="h-7 px-2"
          >
            <LineChartIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={chartType === 'bar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChartType('bar')}
            className="h-7 px-2"
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        {chartType === 'area' ? (
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="monthly-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={RED}   stopOpacity={0.8} />
                <stop offset="50%" stopColor={ORANGE} stopOpacity={0.3} />
                <stop offset="95%" stopColor={GREEN}  stopOpacity={0.1} />
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
                <CustomTooltip {...props} currency={currency} locale={locale} />
              )}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke={RED}
              fill="url(#monthly-gradient)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
                <CustomTooltip {...props} currency={currency} locale={locale} />
              )}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.total)} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </>
  )
}
