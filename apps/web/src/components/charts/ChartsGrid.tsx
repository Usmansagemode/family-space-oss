import { useCallback, useMemo, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { Budget, ExpenseWithNames, Space } from '@family/types'
import { ChartsExpenseTable } from '#/components/charts/ChartsExpenseTable'
import { ChartsHero } from '#/components/charts/ChartsHero'
import { MemberBudgetProgress } from '#/components/charts/MemberBudgetProgress'
import { CategoryAverageChart } from '#/components/charts/CategoryAverageChart'
import { CategoryByMonthChart } from '#/components/charts/CategoryByMonthChart'
import { CategoryMemberBreakdownChart } from '#/components/charts/CategoryMemberBreakdownChart'
import { CategoryTotalChart } from '#/components/charts/CategoryTotalChart'
import { LocationSpendingChart } from '#/components/charts/LocationSpendingChart'
import { MemberCategoryHeatmap } from '#/components/charts/MemberCategoryHeatmap'
import { MemberSpendingChart } from '#/components/charts/MemberSpendingChart'
import { MonthlySpendingChart } from '#/components/charts/MonthlySpendingChart'
import { TopExpensesChart } from '#/components/charts/TopExpensesChart'
import { Button } from '#/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'

const LS_KEY = 'family-charts-order'

const DEFAULT_ORDER = [
  'monthly-spending',
  'category-total',
  'category-average',
  'member-spending',
  'category-member-breakdown',
  'location-spending',
  'top-expenses',
  'member-heatmap',
  'category-by-month',
]

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULT_ORDER
    const parsed = JSON.parse(raw) as string[]
    // Validate: must contain all default keys
    if (
      Array.isArray(parsed) &&
      parsed.length === DEFAULT_ORDER.length &&
      DEFAULT_ORDER.every((k) => parsed.includes(k))
    ) {
      return parsed
    }
  } catch {
    // ignore
  }
  return DEFAULT_ORDER
}

interface ChartsGridProps {
  expenses: ExpenseWithNames[]
  fullYearExpenses?: ExpenseWithNames[]
  currency?: string
  locale?: string
  year: number
  budgets?: Budget[]
  spaces?: Space[]
  selectedMonths?: number[]
}

interface ChartConfig {
  id: string
  title: string
  colSpan: string
  component: React.ReactNode
}

function SortableChartCard({
  id,
  colSpan,
  children,
}: {
  id: string
  colSpan: string
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={colSpan} {...attributes}>
      <div className="bg-card rounded-xl border px-5 pb-5 pt-4 h-full">
        <div className="flex items-start gap-2">
          <div
            {...listeners}
            className="text-muted-foreground/30 hover:text-muted-foreground mt-1 shrink-0 cursor-grab transition-colors active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

function StaticChartCard({
  colSpan,
  children,
}: {
  colSpan: string
  children: React.ReactNode
}) {
  return (
    <div className={colSpan}>
      <div className="bg-card rounded-xl border px-5 pb-5 pt-4 h-full">{children}</div>
    </div>
  )
}

function ChartTitle({ title }: { title: string }) {
  return (
    <p className="mb-3 text-sm font-medium text-muted-foreground">{title}</p>
  )
}

export function ChartsGrid({ expenses, fullYearExpenses, currency, locale, year, budgets, spaces, selectedMonths }: ChartsGridProps) {
  const [order, setOrder] = useState<string[]>(loadOrder)
  // Track active tab so charts only mount when their tab is visible.
  // This prevents Recharts ResponsiveContainer from measuring width=0 inside
  // Radix's `hidden` (display:none) inactive TabsContent.
  const [activeTab, setActiveTab] = useState('budget')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const chartMap = useMemo((): Record<string, ChartConfig> => ({
    'monthly-spending': {
      id: 'monthly-spending',
      title: 'Monthly Spending Trend',
      colSpan: 'lg:col-span-2 xl:col-span-2',
      component: (
        <MonthlySpendingChart expenses={expenses} currency={currency} locale={locale} />
      ),
    },
    'category-total': {
      id: 'category-total',
      title: 'Total by Category',
      colSpan: 'lg:col-span-2 xl:col-span-2',
      component: (
        <CategoryTotalChart expenses={expenses} currency={currency} locale={locale} />
      ),
    },
    'category-average': {
      id: 'category-average',
      title: 'Average Transaction by Category',
      colSpan: 'lg:col-span-2',
      component: (
        <CategoryAverageChart expenses={expenses} currency={currency} locale={locale} />
      ),
    },
    'member-spending': {
      id: 'member-spending',
      title: 'Spending by Member',
      colSpan: 'lg:col-span-2',
      component: (
        <MemberSpendingChart expenses={expenses} currency={currency} locale={locale} />
      ),
    },
    'category-member-breakdown': {
      id: 'category-member-breakdown',
      title: 'Category × Member Breakdown',
      colSpan: 'lg:col-span-2 xl:col-span-2',
      component: (
        <CategoryMemberBreakdownChart
          expenses={expenses}
          currency={currency}
          locale={locale}
        />
      ),
    },
    'location-spending': {
      id: 'location-spending',
      title: 'Spending by Location',
      colSpan: 'lg:col-span-2',
      component: (
        <LocationSpendingChart expenses={expenses} currency={currency} locale={locale} />
      ),
    },
    'top-expenses': {
      id: 'top-expenses',
      title: `Top 10 Expenses — ${year}`,
      colSpan: 'lg:col-span-2 xl:col-span-2',
      component: (
        <TopExpensesChart expenses={expenses} currency={currency} locale={locale} />
      ),
    },
    'member-heatmap': {
      id: 'member-heatmap',
      title: 'Member × Category Heatmap',
      colSpan: 'lg:col-span-3 xl:col-span-4 2xl:col-span-5',
      component: (
        <MemberCategoryHeatmap expenses={expenses} currency={currency} locale={locale} />
      ),
    },
    'category-by-month': {
      id: 'category-by-month',
      title: 'Category Spend by Month',
      colSpan: 'lg:col-span-3 xl:col-span-3',
      component: (
        <CategoryByMonthChart expenses={expenses} currency={currency} locale={locale} />
      ),
    },
  }), [expenses, currency, locale, year])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        setOrder((prev) => {
          const oldIndex = prev.indexOf(active.id as string)
          const newIndex = prev.indexOf(over.id as string)
          const next = arrayMove(prev, oldIndex, newIndex)
          localStorage.setItem(LS_KEY, JSON.stringify(next))
          return next
        })
      }
    },
    [],
  )

  function resetOrder() {
    localStorage.removeItem(LS_KEY)
    setOrder(DEFAULT_ORDER)
  }

  const trendIds = ['monthly-spending', 'category-by-month']
  const breakdownIds = ['category-total', 'category-average', 'location-spending', 'top-expenses']
  const peopleIds = ['member-spending', 'category-member-breakdown', 'member-heatmap']

  function renderStaticGrid(ids: string[]) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {ids.map((id) => {
          const cfg = chartMap[id]
          if (!cfg) return null
          return (
            <StaticChartCard key={id} colSpan={cfg.colSpan}>
              <ChartTitle title={cfg.title} />
              {cfg.component}
            </StaticChartCard>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <ChartsHero
        expenses={expenses}
        fullYearExpenses={fullYearExpenses ?? expenses}
        currency={currency}
        locale={locale}
        year={year}
        selectedMonths={selectedMonths}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="print:hidden">
        <TabsTrigger value="budget">Budget</TabsTrigger>
        <TabsTrigger value="trends">Trends</TabsTrigger>
        <TabsTrigger value="breakdowns">Breakdowns</TabsTrigger>
        <TabsTrigger value="people">People</TabsTrigger>
        <TabsTrigger value="all">All</TabsTrigger>
      </TabsList>

      <TabsContent value="budget" className="mt-4">
        {activeTab === 'budget' && (
          <MemberBudgetProgress
            budgets={budgets ?? []}
            expenses={expenses}
            spaces={spaces ?? []}
            currency={currency}
            locale={locale}
            year={year}
            selectedMonths={selectedMonths}
          />
        )}
      </TabsContent>

      <TabsContent value="trends" className="mt-4">
        {activeTab === 'trends' && (
          <>
            {renderStaticGrid(trendIds)}
            <div className="mt-6">
              <ChartsExpenseTable expenses={fullYearExpenses ?? expenses} currency={currency} locale={locale} />
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="breakdowns" className="mt-4">
        {activeTab === 'breakdowns' && (
          <>
            {renderStaticGrid(breakdownIds)}
            <div className="mt-6">
              <ChartsExpenseTable expenses={fullYearExpenses ?? expenses} currency={currency} locale={locale} />
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="people" className="mt-4">
        {activeTab === 'people' && (
          <>
            {renderStaticGrid(peopleIds)}
            <div className="mt-6">
              <ChartsExpenseTable expenses={fullYearExpenses ?? expenses} currency={currency} locale={locale} />
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="all" className="mt-4">
        {activeTab === 'all' && (
          <>
            <div className="mb-3 flex items-center justify-end gap-2">
              <span className="text-muted-foreground text-xs">Drag to rearrange</span>
              <span className="text-muted-foreground text-xs">•</span>
              <Button variant="ghost" size="xs" onClick={resetOrder}>
                Reset
              </Button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={order} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {order.map((id) => {
                    const cfg = chartMap[id]
                    if (!cfg) return null
                    return (
                      <SortableChartCard key={id} id={id} colSpan={cfg.colSpan}>
                        <ChartTitle title={cfg.title} />
                        {cfg.component}
                      </SortableChartCard>
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
            <div className="mt-6">
              <ChartsExpenseTable expenses={fullYearExpenses ?? expenses} currency={currency} locale={locale} />
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
    </>
  )
}
