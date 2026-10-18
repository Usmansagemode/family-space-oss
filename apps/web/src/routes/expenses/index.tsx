import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowDownLeft, CalendarClock, Pencil, Plus, RefreshCw, ScanEye, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createExpense, createIncomeEntry, updateRecurringTransaction } from '@family/supabase'
import { useAuthContext } from '#/contexts/auth'
import { useUserFamily } from '#/hooks/auth/useUserFamily'
import { useDynamicPlan } from '@family/hooks'
import { useSpaces } from '#/hooks/spaces/useSpaces'
import { useExpenses } from '#/hooks/expenses/useExpenses'
import { useExpenseMutations } from '#/hooks/expenses/useExpenseMutations'
import { useRecurringTransactions } from '#/hooks/expenses/useRecurringTransactions'
import { useRecurringTransactionMutations } from '#/hooks/expenses/useRecurringTransactionMutations'
import { useCategories } from '#/hooks/categories/useCategories'
import { useAllCategories } from '#/hooks/categories/useAllCategories'
import { useIncomeEntries } from '#/hooks/income/useIncomeEntries'
import { useIncomeMutations } from '#/hooks/income/useIncomeMutations'
import { MonthYearSelector } from '#/components/expenses/MonthYearSelector'
import { ExpenseSummary } from '#/components/expenses/ExpenseSummary'
import { ExpenseTable } from '#/components/expenses/ExpenseTable'
import { ExpenseDialog } from '#/components/expenses/ExpenseDialog'
import { IncomeDialog } from '#/components/expenses/IncomeDialog'
import { RecurringTransactionDialog } from '#/components/expenses/RecurringTransactionDialog'
import { CatchUpDialog } from '#/components/expenses/CatchUpDialog'
import { DuplicateExpenseDialog } from '#/components/expenses/DuplicateExpenseDialog'
import type { DuplicateEntry } from '#/components/expenses/DuplicateExpenseDialog'
import { FocusFillMode } from '#/components/expenses/FocusFillMode'
import { FinancialsChart } from '#/components/expenses/FinancialsChart'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { formatCurrency } from '#/lib/utils'
import { buildCatchUpPlan, getMissedOccurrences, nextOccurrence } from '#/lib/recurringExpenses'
import type { CatchUpItem } from '#/lib/recurringExpenses'
import { INCOME_TYPES } from '#/lib/income-types'
import type { ExpenseWithNames, IncomeEntry, IncomeType, RecurringTransaction } from '@family/types'

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1

export const Route = createFileRoute('/expenses/')({
  validateSearch: (s: Record<string, unknown>) => {
    const year = Number(s.year)
    const month = Number(s.month)
    return {
      year: year >= 2000 && year <= 2100 ? year : currentYear,
      month: month >= 1 && month <= 12 ? month : currentMonth,
    }
  },
  component: ExpensesPage,
})

function ExpensesPage() {
  const { user } = useAuthContext()
  const { data: family } = useUserFamily(user?.id)
  const { year, month } = Route.useSearch()
  const navigate = useNavigate({ from: '/expenses/' })

  // expense dialog state
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseWithNames | null>(null)
  const [expenseResetKey, setExpenseResetKey] = useState(0)
  const [focusFillOpen, setFocusFillOpen] = useState(false)

  // income dialog state
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null)
  const [incomeResetKey, setIncomeResetKey] = useState(0)
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null)

  // recurring transaction dialog state
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null)

  // duplicate dialog state
  const [dupOpen, setDupOpen] = useState(false)
  const [dupFlagged, setDupFlagged] = useState<DuplicateEntry | null>(null)
  const [dupMatches, setDupMatches] = useState<DuplicateEntry[]>([])

  // catch-up dialog state
  const [catchUpOpen, setCatchUpOpen] = useState(false)
  const [catchUpItems, setCatchUpItems] = useState<CatchUpItem[]>([])
  const catchUpRan = useRef(false)
  const queryClient = useQueryClient()

  const familyId = family?.id ?? ''
  const currency = family?.currency
  const locale = family?.locale
  const { can } = useDynamicPlan(familyId, family?.plan ?? 'free')

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const { data: expenses, isLoading: loadingExpenses } = useExpenses(familyId, year, month)
  const { data: prevExpenses } = useExpenses(familyId, prevYear, prevMonth)
  const { data: categories } = useCategories(familyId)
  const { data: allCategories } = useAllCategories(familyId)
  const { data: spaces } = useSpaces(familyId)
  const expenseMutations = useExpenseMutations(familyId, year, month)

  const prevTotal = (prevExpenses ?? []).reduce((sum, e) => sum + e.amount, 0)

  const { data: incomeEntries, isLoading: loadingIncome } = useIncomeEntries(familyId, year, month)
  const incomeMutations = useIncomeMutations(familyId, year, month)

  const locationSpaces = (spaces ?? []).filter((s) => s.type === 'store' && s.showInExpenses)
  const personSpaces = (spaces ?? []).filter((s) => s.type === 'person' && s.showInExpenses)
  const myPersonSpaceId = personSpaces.find((s) => s.linkedUserId === user?.id)?.id ?? null

  const incomeTotal = (incomeEntries ?? []).reduce((sum, e) => sum + e.amount, 0)

  const { data: recurringTransactions } = useRecurringTransactions(familyId)
  const recurringMutations = useRecurringTransactionMutations(familyId)

  // Catch-up: run once per session when recurring transactions load
  useEffect(() => {
    if (!recurringTransactions || catchUpRan.current || !familyId) return
    catchUpRan.current = true

    const plan = buildCatchUpPlan(recurringTransactions)

    // Auto-generate ≤2 missed silently
    if (plan.autoGenerate.length > 0) {
      void (async () => {
        try {
          for (const { recurring, missedDates } of plan.autoGenerate) {
            await Promise.all(
              missedDates.map((date) => {
                if (recurring.direction === 'expense') {
                  return createExpense({
                    familyId,
                    amount: recurring.amount,
                    date,
                    description: recurring.description,
                    categoryId: recurring.categoryId,
                    locationId: recurring.locationId,
                    paidById: recurring.paidById,
                    autoGenerated: true,
                    recurringTransactionId: recurring.id,
                  })
                } else {
                  return createIncomeEntry({
                    familyId,
                    amount: recurring.amount,
                    date,
                    description: recurring.description,
                    personId: recurring.personId,
                    type: recurring.incomeType,
                    autoGenerated: true,
                    recurringTransactionId: recurring.id,
                  })
                }
              }),
            )
            const lastDate = missedDates[missedDates.length - 1]
            await updateRecurringTransaction(recurring.id, {
              nextDueDate: nextOccurrence(lastDate, recurring.frequency),
            })
          }
          void queryClient.invalidateQueries({ queryKey: ['expenses', familyId] })
          void queryClient.invalidateQueries({ queryKey: ['income-entries', familyId] })
        } catch {
          // Silent failure — don't disrupt the user
        }
      })()
    }

    // Surface ≥3 missed to user
    if (plan.needsReview.length > 0) {
      setCatchUpItems(plan.needsReview)
      setCatchUpOpen(true)
    }
  }, [recurringTransactions, familyId])

  // React rules of hooks require all hooks above this point before any conditional returns
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your expenses.</p>
      </div>
    )
  }

  // ── Expense handlers ──────────────────────────────────────────────────────

  function handleSaveExpense(data: {
    amount: number
    date: string
    description?: string
    categoryId?: string | null
    locationId?: string | null
    paidById?: string | null
  }) {
    if (editingExpense) {
      expenseMutations.update.mutate(
        { id: editingExpense.id, ...data },
        { onSuccess: () => setExpenseDialogOpen(false) },
      )
    } else {
      const categoryName = data.categoryId
        ? categories?.find((c) => c.id === data.categoryId)?.name
        : undefined
      expenseMutations.create.mutate(
        { ...data, categoryName },
        { onSuccess: () => setExpenseResetKey((k) => k + 1) },
      )
    }
  }

  function handleFlagClick(flagged: DuplicateEntry, matches: DuplicateEntry[]) {
    setDupFlagged(flagged)
    setDupMatches(matches)
    setDupOpen(true)
  }

  function openAddExpense() {
    setEditingExpense(null)
    setExpenseDialogOpen(true)
  }

  function openEditExpense(expense: ExpenseWithNames) {
    setEditingExpense(expense)
    setExpenseDialogOpen(true)
  }

  // ── Income handlers ───────────────────────────────────────────────────────

  function openAddIncome() {
    setEditingEntry(null)
    setIncomeDialogOpen(true)
  }

  function openEditIncome(entry: IncomeEntry) {
    setEditingEntry(entry)
    setIncomeDialogOpen(true)
  }

  function handleSaveIncome(data: {
    amount: number
    date: string
    description?: string
    personId: string | null
    type: IncomeType | null
  }) {
    if (editingEntry) {
      incomeMutations.update.mutate(
        { id: editingEntry.id, ...data },
        { onSuccess: () => setIncomeDialogOpen(false) },
      )
    } else {
      incomeMutations.create.mutate(data, {
        onSuccess: () => setIncomeResetKey((k) => k + 1),
      })
    }
  }

  // ── Recurring saved handler ───────────────────────────────────────────────

  async function handleRecurringSaved(updated: RecurringTransaction) {
    const missed = getMissedOccurrences(updated.nextDueDate, updated.frequency)
    if (missed.length === 0) return

    const item: CatchUpItem = { recurring: updated, missedDates: missed }

    if (missed.length <= 2) {
      try {
        await Promise.all(
          missed.map((date) => {
            if (updated.direction === 'expense') {
              return createExpense({
                familyId,
                amount: updated.amount,
                date,
                description: updated.description,
                categoryId: updated.categoryId,
                locationId: updated.locationId,
                paidById: updated.paidById,
                autoGenerated: true,
                recurringTransactionId: updated.id,
              })
            } else {
              return createIncomeEntry({
                familyId,
                amount: updated.amount,
                date,
                description: updated.description,
                personId: updated.personId,
                type: updated.incomeType,
                autoGenerated: true,
                recurringTransactionId: updated.id,
              })
            }
          }),
        )
        await updateRecurringTransaction(updated.id, {
          nextDueDate: nextOccurrence(missed[missed.length - 1], updated.frequency),
        })
        void queryClient.invalidateQueries({ queryKey: ['expenses', familyId] })
        void queryClient.invalidateQueries({ queryKey: ['income-entries', familyId] })
        void queryClient.invalidateQueries({ queryKey: ['recurring-transactions', familyId] })
      } catch {
        // Silent failure
      }
    } else {
      setCatchUpItems([item])
      setCatchUpOpen(true)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Finances</h1>
        <MonthYearSelector
          year={year}
          month={month}
          onChange={(y, m) => { void navigate({ search: { year: y, month: m }, replace: true }) }}
        />
      </div>

      <FinancialsChart
        familyId={familyId}
        year={year}
        currentMonth={month}
        currency={currency}
        locale={locale}
      />

      <Tabs defaultValue="expenses">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="recurring" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Recurring
              {(recurringTransactions ?? []).length > 0 && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {(recurringTransactions ?? []).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <TabsContent value="expenses" className="mt-0 flex gap-2">
              {(expenses ?? []).length > 0 && (
                <Button variant="outline" onClick={() => setFocusFillOpen(true)}>
                  <ScanEye className="mr-1.5 h-4 w-4" />
                  Quick Tag
                </Button>
              )}
              <Button onClick={openAddExpense}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add expense
              </Button>
            </TabsContent>
            <TabsContent value="income" className="mt-0">
              <Button onClick={openAddIncome}>
                <Plus className="mr-1.5 h-4 w-4" />
                Log income
              </Button>
            </TabsContent>
            <TabsContent value="recurring" className="mt-0">
              <Button onClick={() => { setEditingRecurring(null); setRecurringDialogOpen(true) }}>
                <Plus className="mr-1.5 h-4 w-4" />
                New recurring
              </Button>
            </TabsContent>
          </div>
        </div>

        {/* ── Expenses tab ── */}
        <TabsContent value="expenses" className="mt-4 flex flex-col gap-4">
          {loadingExpenses ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            </>
          ) : (
            <>
              <ExpenseSummary
                expenses={expenses ?? []}
                categories={categories ?? []}
                personSpaces={personSpaces}
                prevTotal={prevTotal}
                currency={currency}
                locale={locale}
              />
              <ExpenseTable
                expenses={expenses ?? []}
                categories={categories ?? []}
                locationSpaces={locationSpaces}
                personSpaces={personSpaces}
                familyId={familyId}
                currency={currency}
                locale={locale}
                onEdit={openEditExpense}
                onDelete={(id) => expenseMutations.remove.mutate(id)}
                onDeleteMany={(ids) => expenseMutations.removeMany.mutate(ids)}
                onBulkUpdate={(ids, patch) => expenseMutations.bulkUpdateUniform.mutate({ ids, patch })}
                onClickRecurring={(id) => {
                  const t = (recurringTransactions ?? []).find((r) => r.id === id)
                  if (t) { setEditingRecurring(t); setRecurringDialogOpen(true) }
                }}
                onFlagClick={handleFlagClick}
                showDuplicates={can.expensesDuplicates}
              />
            </>
          )}
        </TabsContent>

        {/* ── Income tab ── */}
        <TabsContent value="income" className="mt-4">
          {loadingIncome ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : (incomeEntries ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <ArrowDownLeft className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No income logged for this month.</p>
              <Button variant="outline" onClick={openAddIncome}>
                <Plus className="mr-1.5 h-4 w-4" />
                Log income
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Summary card */}
              <div className="rounded-xl border bg-card px-5 py-4">
                <p className="text-xs text-muted-foreground">Total income</p>
                <p className="mt-0.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(incomeTotal, currency, locale)}
                </p>
              </div>

              {/* Entry list */}
              {(incomeEntries ?? []).map((entry) => {
                const person = personSpaces.find((s) => s.id === entry.personId)
                const typeDef = INCOME_TYPES.find((t) => t.id === entry.type)
                const Icon = typeDef?.icon ?? ArrowDownLeft
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ background: (typeDef?.hex ?? '#10b981') + '26' }}
                    >
                      <Icon className="h-4 w-4" style={{ color: typeDef?.hex ?? '#10b981' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {entry.autoGenerated && (
                          entry.recurringTransactionId ? (
                            <button
                              type="button"
                              title="Auto-generated from recurring transaction — click to edit"
                              className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
                              onClick={() => {
                                const t = (recurringTransactions ?? []).find((r) => r.id === entry.recurringTransactionId)
                                if (t) { setEditingRecurring(t); setRecurringDialogOpen(true) }
                              }}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          ) : (
                            <span title="Auto-generated (template deleted)">
                              <RefreshCw className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                            </span>
                          )
                        )}
                        <p className="truncate text-sm font-medium">
                          {entry.description || typeDef?.label || 'Income'}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.date}
                        {person && <span className="ml-2">· {person.name}</span>}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(entry.amount, currency, locale)}
                    </p>
                    <button
                      type="button"
                      onClick={() => openEditIncome(entry)}
                      className="shrink-0 text-muted-foreground transition hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingIncomeId(entry.id)}
                      className="shrink-0 text-muted-foreground transition hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
        {/* ── Recurring tab ── */}
        <TabsContent value="recurring" className="mt-4">
          {(recurringTransactions ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No recurring transactions yet.</p>
              <Button variant="outline" onClick={() => { setEditingRecurring(null); setRecurringDialogOpen(true) }}>
                <Plus className="mr-1.5 h-4 w-4" />
                New recurring
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(recurringTransactions ?? []).map((r) => {
                const memberId = r.direction === 'expense' ? r.paidById : r.personId
                const member = memberId ? personSpaces.find((s) => s.id === memberId) : null
                return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.description}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="capitalize">{r.direction}</span>
                      {' · '}
                      {r.frequency.charAt(0).toUpperCase() + r.frequency.slice(1)}
                      {member && <span> · {member.name}</span>}
                      {' · '}Next: {r.nextDueDate}
                      {r.endDate && <span className="ml-1">· Ends {r.endDate}</span>}
                    </p>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold ${r.direction === 'income' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {r.direction === 'income' ? '+' : ''}{formatCurrency(r.amount, currency, locale)}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setEditingRecurring(r); setRecurringDialogOpen(true) }}
                    className="shrink-0 text-muted-foreground transition hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => recurringMutations.remove.mutate(r.id, {
                      onSuccess: () => toast.success('Recurring transaction deleted'),
                      onError: () => toast.error('Failed to delete'),
                    })}
                    className="shrink-0 text-muted-foreground transition hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )})}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Focus fill mode */}
      <FocusFillMode
        open={focusFillOpen}
        onOpenChange={setFocusFillOpen}
        expenses={expenses ?? []}
        categories={categories ?? []}
        locationSpaces={locationSpaces}
        personSpaces={personSpaces}
        currency={currency}
        locale={locale}
        onSave={(updates) => {
          expenseMutations.bulkUpdatePerItem.mutate(updates, {
            onSuccess: () => setFocusFillOpen(false),
          })
        }}
        isSaving={expenseMutations.bulkUpdatePerItem.isPending}
      />

      {/* Expense dialog — pass all categories when editing so archived selections are preserved */}
      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        expense={editingExpense}
        categories={editingExpense ? (allCategories ?? []) : (categories ?? [])}
        locationSpaces={locationSpaces}
        personSpaces={personSpaces}
        onSave={handleSaveExpense}
        isSaving={expenseMutations.create.isPending || expenseMutations.update.isPending}
        resetKey={expenseResetKey}
        defaultDate={`${year}-${String(month).padStart(2, '0')}-01`}
        defaultPaidById={myPersonSpaceId}
      />

      {/* Income dialog */}
      <IncomeDialog
        open={incomeDialogOpen}
        onOpenChange={(o) => {
          setIncomeDialogOpen(o)
          if (!o) setEditingEntry(null)
        }}
        entry={editingEntry}
        year={year}
        month={month}
        personSpaces={personSpaces}
        onSave={handleSaveIncome}
        isSaving={incomeMutations.create.isPending || incomeMutations.update.isPending}
        resetKey={incomeResetKey}
      />

      {/* Recurring transaction dialog */}
      <RecurringTransactionDialog
        familyId={familyId}
        categories={categories ?? []}
        personSpaces={personSpaces}
        locationSpaces={locationSpaces}
        open={recurringDialogOpen}
        onOpenChange={(o) => { setRecurringDialogOpen(o); if (!o) setEditingRecurring(null) }}
        editing={editingRecurring ?? undefined}
        onSaved={handleRecurringSaved}
      />

      {/* Duplicate expense dialog */}
      {dupFlagged && (
        <DuplicateExpenseDialog
          open={dupOpen}
          onOpenChange={(o) => { setDupOpen(o); if (!o) { setDupFlagged(null); setDupMatches([]) } }}
          flagged={dupFlagged}
          matches={dupMatches}
          currency={currency}
          locale={locale}
          onDelete={(id) => {
            expenseMutations.remove.mutate(id, {
              onSuccess: () => {
                // Deleting the flagged entry itself — close entirely
                if (id === dupFlagged?.id) {
                  setDupOpen(false)
                  setDupFlagged(null)
                  setDupMatches([])
                  return
                }
                const remaining = dupMatches.filter((m) => m.id !== id)
                if (remaining.length === 0) {
                  setDupOpen(false)
                  setDupFlagged(null)
                  setDupMatches([])
                } else {
                  setDupMatches(remaining)
                }
              },
            })
          }}
          onKeepAll={() => { setDupOpen(false); setDupFlagged(null); setDupMatches([]) }}
          isDeleting={expenseMutations.remove.isPending}
        />
      )}

      {/* Catch-up dialog */}
      <CatchUpDialog
        familyId={familyId}
        items={catchUpItems}
        open={catchUpOpen}
        onOpenChange={setCatchUpOpen}
        onDone={() => {
          void queryClient.invalidateQueries({ queryKey: ['expenses', familyId] })
          void queryClient.invalidateQueries({ queryKey: ['income-entries', familyId] })
        }}
      />

      {/* Income delete confirmation */}
      <AlertDialog open={!!deletingIncomeId} onOpenChange={(o) => { if (!o) setDeletingIncomeId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete income entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingIncomeId) {
                  incomeMutations.remove.mutate(deletingIncomeId, {
                    onSuccess: () => setDeletingIncomeId(null),
                  })
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
