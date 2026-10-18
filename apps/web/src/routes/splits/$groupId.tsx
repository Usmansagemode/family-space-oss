import { useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SplitExpenseWithShares } from '@family/types'
import { useAuthContext } from '#/contexts/auth'
import { useUserFamily } from '#/hooks/auth/useUserFamily'
import { useSplitGroups } from '#/hooks/splits/useSplitGroups'
import { useSplitExpenseMutations } from '#/hooks/splits/useSplitExpenseMutations'
import { useSplitExpenses } from '#/hooks/splits/useSplitExpenses'
import { useSplitParticipants } from '#/hooks/splits/useSplitParticipants'
import { useSplitSettlements } from '#/hooks/splits/useSplitSettlements'
import { AddExpenseSheet } from '#/components/splits/AddExpenseSheet'
import { ManageParticipantsSheet } from '#/components/splits/ManageParticipantsSheet'
import { SettleUpSheet } from '#/components/splits/SettleUpSheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import { Badge } from '#/components/ui/badge'
import { BorderBeam } from '#/components/ui/border-beam'
import { Button } from '#/components/ui/button'
import { NumberTicker } from '#/components/ui/number-ticker'
import { Separator } from '#/components/ui/separator'
import { calculateBalances, simplifyDebts } from '#/lib/splitBalance'
import type { SimplifiedDebt } from '#/lib/splitBalance'
import { formatCurrency } from '#/lib/utils'

export const Route = createFileRoute('/splits/$groupId')({
  component: GroupDetailPage,
})

const SPLIT_TYPE_COLORS: Record<string, string> = {
  equal: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  shares: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  percentage: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
}

function nameToColor(name: string) {
  const colors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'
  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-semibold shrink-0 ${sizeClass} ${nameToColor(name)}`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function GroupDetailPage() {
  const { groupId } = Route.useParams()
  const { user } = useAuthContext()
  const { data: family } = useUserFamily(user?.id)
  const familyId = family?.id ?? ''
  const currency = family?.currency
  const locale = family?.locale

  const { data: groups } = useSplitGroups(familyId)
  const group = groups?.find((g) => g.id === groupId)

  const { data: participants = [] } = useSplitParticipants(groupId)
  const { data: expenses = [] } = useSplitExpenses(groupId)
  const { data: settlements = [] } = useSplitSettlements(groupId)
  const { remove: removeExpense } = useSplitExpenseMutations(groupId, familyId)

  const [addOpen, setAddOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<SplitExpenseWithShares | undefined>()
  const [participantsOpen, setParticipantsOpen] = useState(false)
  const [settleDebt, setSettleDebt] = useState<SimplifiedDebt | undefined>()
  const [settleOpen, setSettleOpen] = useState(false)

  const participantMap = useMemo(
    () => Object.fromEntries(participants.map((p) => [p.id, p.name])),
    [participants],
  )

  const balances = useMemo(
    () => calculateBalances(participants, expenses, settlements),
    [participants, expenses, settlements],
  )

  const simplified = useMemo(() => simplifyDebts(balances), [balances])
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const isSettled = simplified.length === 0 && balances.length > 0

  async function handleDeleteExpense(id: string) {
    try {
      await removeExpense.mutateAsync(id)
      toast.success('Expense deleted')
    } catch {
      toast.error('Failed to delete expense')
    }
  }

  function handleSettle(debt: SimplifiedDebt) {
    setSettleDebt(debt)
    setSettleOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/splits/" style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{group?.name ?? '…'}</h1>
            {group?.description && (
              <p className="text-muted-foreground text-sm">{group.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setParticipantsOpen(true)}
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Participants</span>
            <Badge variant="secondary" className="ml-0.5">{participants.length}</Badge>
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => { setEditingExpense(undefined); setAddOpen(true) }}
          >
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border rounded-xl px-4 py-3">
            <p className="text-muted-foreground text-xs mb-1">Total spent</p>
            <p className="font-bold text-lg tabular-nums">
              {currency === 'USD' ? '$' : currency}{' '}
              <NumberTicker value={totalSpent} decimalPlaces={2} className="text-foreground" />
            </p>
          </div>
          <div className="bg-card border rounded-xl px-4 py-3">
            <p className="text-muted-foreground text-xs mb-1">Expenses</p>
            <p className="font-bold text-lg">
              <NumberTicker value={expenses.length} className="text-foreground" />
            </p>
          </div>
          <div className="bg-card border rounded-xl px-4 py-3">
            <p className="text-muted-foreground text-xs mb-1">People</p>
            <p className="font-bold text-lg">
              <NumberTicker value={participants.length} className="text-foreground" />
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Expenses — 2/3 */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Expenses
          </h2>

          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center rounded-2xl border border-dashed">
              <div className="rounded-full bg-muted p-3">
                <Receipt className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <div>
                <p className="font-medium text-sm">No expenses yet</p>
                <p className="text-muted-foreground text-xs mt-0.5">Add the first one to start tracking.</p>
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => { setEditingExpense(undefined); setAddOpen(true) }}
              >
                <Plus className="h-3.5 w-3.5" /> Add Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => {
                const paidByName = participantMap[expense.paidByParticipantId] ?? '?'
                return (
                  <div
                    key={expense.id}
                    className="bg-card border rounded-2xl px-4 py-3.5 flex items-start justify-between gap-3 hover:border-border/80 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar name={paidByName} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{expense.description}</span>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${SPLIT_TYPE_COLORS[expense.splitType] ?? ''}`}
                          >
                            {expense.splitType}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {expense.date} · Paid by <span className="font-medium text-foreground">{paidByName}</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {expense.shares.map((s) => {
                            const name = participantMap[s.participantId] ?? '?'
                            return (
                              <span
                                key={s.id}
                                className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5"
                              >
                                <span
                                  className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${nameToColor(name)}`}
                                >
                                  {name.charAt(0).toUpperCase()}
                                </span>
                                {formatCurrency(s.amount, currency, locale)}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-bold text-base">
                        {formatCurrency(expense.amount, currency, locale)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingExpense(expense); setAddOpen(true) }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove "{expense.description}" and all its splits. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Balances — 1/3 */}
        <div className="space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Balances
          </h2>

          {participants.length === 0 ? (
            <p className="text-muted-foreground text-sm">Add participants to see balances.</p>
          ) : (
            <div className="space-y-2">
              {balances.map((b) => {
                const isPositive = b.net > 0.005
                const isNegative = b.net < -0.005
                return (
                  <div
                    key={b.participantId}
                    className={[
                      'relative bg-card border-l-4 rounded-r-xl rounded-l-sm pl-3 pr-4 py-3 flex items-center justify-between gap-2 overflow-hidden',
                      isPositive ? 'border-l-emerald-500'
                        : isNegative ? 'border-l-destructive'
                        : 'border-l-border',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={b.name} size="sm" />
                      <span className="font-medium text-sm truncate">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isPositive && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                      {isNegative && <TrendingDown className="h-3 w-3 text-destructive" />}
                      <span
                        className={[
                          'text-sm font-bold tabular-nums',
                          isPositive ? 'text-emerald-600 dark:text-emerald-400'
                            : isNegative ? 'text-destructive'
                            : 'text-muted-foreground',
                        ].join(' ')}
                      >
                        {isPositive ? '+' : ''}{formatCurrency(b.net, currency, locale)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Simplified debts */}
          {simplified.length > 0 && (
            <>
              <Separator />
              <div className="relative overflow-hidden rounded-2xl border bg-card">
                <BorderBeam size={100} duration={10} colorFrom="oklch(0.65 0.2 25)" colorTo="transparent" borderWidth={1} />
                <div className="p-4 space-y-3">
                  <p className="text-sm font-semibold">Settle up</p>
                  <div className="space-y-2">
                    {simplified.map((debt, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
                          <Avatar name={debt.fromName} size="sm" />
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <Avatar name={debt.toName} size="sm" />
                          <span className="font-medium text-muted-foreground ml-0.5 truncate">
                            {formatCurrency(debt.amount, currency, locale)}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-7 text-xs gap-1"
                          onClick={() => handleSettle(debt)}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Settle
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {isSettled && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">All settled up</p>
            </div>
          )}
        </div>
      </div>

      <AddExpenseSheet
        groupId={groupId}
        familyId={familyId}
        participants={participants}
        currency={currency}
        locale={locale}
        open={addOpen}
        onOpenChange={(v) => { setAddOpen(v); if (!v) setEditingExpense(undefined) }}
        editing={editingExpense}
      />

      <ManageParticipantsSheet
        groupId={groupId}
        participants={participants}
        open={participantsOpen}
        onOpenChange={setParticipantsOpen}
      />

      <SettleUpSheet
        groupId={groupId}
        familyId={familyId}
        participants={participants}
        debt={settleDebt}
        open={settleOpen}
        onOpenChange={setSettleOpen}
      />
    </div>
  )
}
