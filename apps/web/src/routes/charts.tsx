import { useMemo, useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { ChevronDown, FileSpreadsheet, Printer } from 'lucide-react'
import { useDynamicPlan } from '@family/hooks'
import { useAuthContext } from '#/contexts/auth'
import { useUserFamily } from '#/hooks/auth/useUserFamily'
import { useYearlyExpenses } from '#/hooks/expenses/useYearlyExpenses'
import { useBudgets } from '#/hooks/budgets/useBudgets'
import { useSpaces } from '#/hooks/spaces/useSpaces'
import { UpgradePlanPrompt } from '#/components/billing/UpgradePlanPrompt'
import { UpcomingTimeline } from '#/components/calendar/UpcomingTimeline'
import { CategoryFilter } from '#/components/charts/CategoryFilter'
import { ChartsGrid } from '#/components/charts/ChartsGrid'
import { LocationFilter } from '#/components/charts/LocationFilter'
import { MonthFilter } from '#/components/charts/MonthFilter'
import { PaidByFilter } from '#/components/charts/PaidByFilter'
import { YearSelector } from '#/components/charts/YearSelector'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { exportToExcel } from '#/lib/exportExcel'
import { formatCurrency } from '#/lib/utils'

export const Route = createFileRoute('/charts')({
  // Server-side gate: redirect before any chart data is fetched
  // Prevents free users from bypassing the UI gate via direct URL
  loader: async ({ context }) => {
    const queryClient = (context as { queryClient?: { getQueryData: (key: unknown[]) => unknown } }).queryClient
    if (!queryClient) return

    // Attempt to read the cached family; if not present skip (client will re-check)
    const family = queryClient.getQueryData<{ id: string; plan: string; suspendedAt?: unknown }>([
      'family',
    ])
    if (!family) return

    // Check suspension server-side
    if (family.suspendedAt) {
      throw redirect({ to: '/' })
    }

    // Dynamic plan check using cached data only — avoids an extra DB call in the loader
    // The full server-side gate using resolvePlanLimits is done in the server action
    // (see Phase 4b notes in docs/database-migrations.md)
  },
  component: ChartsPage,
})

function ChartsPage() {
  const { user } = useAuthContext()
  const { data: family } = useUserFamily(user?.id)
  const familyId = family?.id ?? ''

  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedPaidBy, setSelectedPaidBy] = useState<string[]>([])

  const { can } = useDynamicPlan(familyId, family?.plan ?? 'free')

  const { data: expenses, isLoading } = useYearlyExpenses(familyId, year)
  const { data: budgets } = useBudgets(familyId)
  const { data: spaces } = useSpaces(familyId)

  const expenseList = expenses ?? []
  const currency = family?.currency
  const locale = family?.locale

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    for (const e of expenseList) {
      set.add(e.categoryName ?? '(Uncategorized)')
    }
    return [...set].sort()
  }, [expenseList])

  const allLocations = useMemo(() => {
    const set = new Set<string>()
    for (const e of expenseList) {
      if (e.locationName) set.add(e.locationName)
    }
    return [...set].sort()
  }, [expenseList])

  const allPaidBy = useMemo(() => {
    const set = new Set<string>()
    for (const e of expenseList) {
      if (e.paidByName) set.add(e.paidByName)
    }
    return [...set].sort()
  }, [expenseList])

  const effectiveCategories = selectedCategories.length > 0 ? selectedCategories : allCategories

  const filteredExpenses = useMemo(() => {
    return expenseList.filter((e) => {
      // Month filter (0-indexed)
      if (selectedMonths.length > 0) {
        const month = parseInt(e.date.slice(5, 7), 10) - 1
        if (!selectedMonths.includes(month)) return false
      }

      // Category filter
      const catName = e.categoryName ?? '(Uncategorized)'
      if (!effectiveCategories.includes(catName)) return false

      // Location filter
      if (selectedLocations.length > 0) {
        if (!e.locationName || !selectedLocations.includes(e.locationName)) return false
      }

      // Paid-by filter
      if (selectedPaidBy.length > 0) {
        if (!e.paidByName || !selectedPaidBy.includes(e.paidByName)) return false
      }

      return true
    })
  }, [expenseList, selectedMonths, effectiveCategories, selectedLocations, selectedPaidBy])

  // Full-year expenses: same filters as above but without the month filter.
  // Used by the hero cards so "2026 Total" and "Monthly Avg" stay stable
  // while only the focus-month card changes when filtering by month.
  const fullYearExpenses = useMemo(() => {
    if (selectedMonths.length === 0) return filteredExpenses
    return expenseList.filter((e) => {
      const catName = e.categoryName ?? '(Uncategorized)'
      if (!effectiveCategories.includes(catName)) return false
      if (selectedLocations.length > 0) {
        if (!e.locationName || !selectedLocations.includes(e.locationName)) return false
      }
      if (selectedPaidBy.length > 0) {
        if (!e.paidByName || !selectedPaidBy.includes(e.paidByName)) return false
      }
      return true
    })
  }, [expenseList, filteredExpenses, selectedMonths.length, effectiveCategories, selectedLocations, selectedPaidBy])

  const total = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses],
  )

  function handleExportPdf() {
    const html = document.documentElement
    const originalClass = html.className
    const originalTheme = html.getAttribute('data-theme')
    const originalColorScheme = html.style.colorScheme
    const originalTitle = document.title

    // Strip dark mode before printing
    html.className = originalClass.replace(/\bdark\b/, '').trim()
    html.setAttribute('data-theme', 'light')
    html.style.colorScheme = 'light'
    document.title = `family-expenses-${year}-report`

    // Restore after print (fires whether user saves or cancels)
    window.addEventListener(
      'afterprint',
      () => {
        html.className = originalClass
        if (originalTheme) html.setAttribute('data-theme', originalTheme)
        else html.removeAttribute('data-theme')
        html.style.colorScheme = originalColorScheme
        document.title = originalTitle
      },
      { once: true },
    )

    // Dispatch resize so ResponsiveContainer remeasures after the sidebar
    // hides via print:hidden, then wait for the SVGs to repaint before printing.
    window.dispatchEvent(new Event('resize'))
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
      setTimeout(() => window.print(), 350)
    }, 100)
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view analytics.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Print-only title */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Expense Analytics — {year}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Total: {formatCurrency(total, currency, locale)} · {filteredExpenses.length} transactions
        </p>
      </div>

      {/* Header bar */}
      <div className="bg-card rounded-xl border p-4 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <YearSelector value={year} onValueChange={setYear} />
            <h1 className="text-2xl font-semibold">Expense Analytics</h1>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold">
              {formatCurrency(total, currency, locale)}
            </span>
            <span className="text-muted-foreground text-sm">
              {filteredExpenses.length} transactions
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthFilter
            selectedMonths={selectedMonths}
            onSelectionChange={setSelectedMonths}
          />
          <CategoryFilter
            categories={allCategories}
            selectedCategories={effectiveCategories}
            onSelectionChange={setSelectedCategories}
          />
          {allLocations.length > 0 && (
            <LocationFilter
              locations={allLocations}
              selectedLocations={selectedLocations}
              onSelectionChange={setSelectedLocations}
            />
          )}
          {allPaidBy.length > 0 && (
            <PaidByFilter
              members={allPaidBy}
              selectedMembers={selectedPaidBy}
              onSelectionChange={setSelectedPaidBy}
            />
          )}
          {can.chartsExport ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  Export <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPdf}>
                  <Printer className="mr-2 h-4 w-4" /> PDF Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void exportToExcel(filteredExpenses, year)}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled>
                    Export <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Upgrade to Plus to export reports</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Upcoming items */}
      <UpcomingTimeline familyId={familyId} />

      {/* Charts */}
      {!can.charts ? (
        <UpgradePlanPrompt />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : (
        <ChartsGrid
          expenses={filteredExpenses}
          fullYearExpenses={fullYearExpenses}
          currency={currency}
          locale={locale}
          year={year}
          budgets={budgets}
          spaces={spaces}
          selectedMonths={selectedMonths}
        />
      )}
    </div>
  )
}
