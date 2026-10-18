import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { SplitParticipant, SplitExpenseWithShares, SplitType } from '@family/types'
import { useSplitExpenseMutations } from '#/hooks/splits/useSplitExpenseMutations'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { formatCurrency } from '#/lib/utils'

type Props = {
  groupId: string
  familyId: string
  participants: SplitParticipant[]
  currency?: string
  locale?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: SplitExpenseWithShares
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeShares(
  participants: SplitParticipant[],
  amount: number,
  splitType: SplitType,
  inputs: Record<string, number>,
): Array<{ participantId: string; amount: number }> {
  if (splitType === 'equal') {
    const included = participants.filter((p) => inputs[p.id] !== 0)
    if (included.length === 0) return []
    const each = amount / included.length
    // Distribute evenly, adjust last to avoid rounding drift
    const rounded = included.map((p, i) => ({
      participantId: p.id,
      amount: i < included.length - 1 ? Math.round(each * 100) / 100 : 0,
    }))
    const distributed = rounded.slice(0, -1).reduce((s, r) => s + r.amount, 0)
    rounded[rounded.length - 1].amount = Math.round((amount - distributed) * 100) / 100
    return rounded
  }

  if (splitType === 'shares') {
    const total = participants.reduce((s, p) => s + (inputs[p.id] ?? 0), 0)
    if (total === 0) return []
    const active = participants.filter((p) => (inputs[p.id] ?? 0) > 0)
    const shares = active.map((p, i) => ({
      participantId: p.id,
      amount: i < active.length - 1
        ? Math.round(((inputs[p.id] ?? 0) / total) * amount * 100) / 100
        : 0,
    }))
    const distributed = shares.slice(0, -1).reduce((s, r) => s + r.amount, 0)
    shares[shares.length - 1].amount = Math.round((amount - distributed) * 100) / 100
    return shares
  }

  if (splitType === 'percentage') {
    const active = participants.filter((p) => (inputs[p.id] ?? 0) > 0)
    const shares = active.map((p, i) => ({
      participantId: p.id,
      amount: i < active.length - 1
        ? Math.round(((inputs[p.id] ?? 0) / 100) * amount * 100) / 100
        : 0,
    }))
    const distributed = shares.slice(0, -1).reduce((s, r) => s + r.amount, 0)
    if (shares.length > 0) shares[shares.length - 1].amount = Math.round((amount - distributed) * 100) / 100
    return shares
  }

  return []
}

export function AddExpenseSheet({
  groupId,
  familyId,
  participants,
  currency,
  locale,
  open,
  onOpenChange,
  editing,
}: Props) {
  const { create, update } = useSplitExpenseMutations(groupId, familyId)

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [paidBy, setPaidBy] = useState('')
  const [splitType, setSplitType] = useState<SplitType>('equal')
  // For equal: 1 = included, 0 = excluded
  // For shares/percentage: numeric value
  const [inputs, setInputs] = useState<Record<string, number>>({})

  // Seed defaults when opening
  useEffect(() => {
    if (!open) return
    if (editing) {
      setDescription(editing.description ?? '')
      setAmount(String(editing.amount))
      setDate(editing.date)
      setPaidBy(editing.paidByParticipantId)
      setSplitType(editing.splitType)
      const shareMap: Record<string, number> = {}
      if (editing.splitType === 'equal') {
        for (const p of participants) shareMap[p.id] = editing.shares.some((s) => s.participantId === p.id) ? 1 : 0
      } else {
        for (const s of editing.shares) shareMap[s.participantId] = s.amount
      }
      setInputs(shareMap)
    } else {
      setDescription('')
      setAmount('')
      setDate(today())
      setPaidBy(participants[0]?.id ?? '')
      setSplitType('equal')
      const defaults: Record<string, number> = {}
      for (const p of participants) defaults[p.id] = splitType === 'equal' ? 1 : 1
      setInputs(defaults)
    }
  }, [open, editing, participants])

  // Reset inputs when split type changes
  function handleSplitTypeChange(t: SplitType) {
    setSplitType(t)
    const defaults: Record<string, number> = {}
    for (const p of participants) {
      defaults[p.id] = t === 'equal' ? 1 : 1
    }
    setInputs(defaults)
  }

  const numAmount = parseFloat(amount) || 0
  const resolvedShares = computeShares(participants, numAmount, splitType, inputs)
  const shareMap = Object.fromEntries(resolvedShares.map((s) => [s.participantId, s.amount]))

  const percentageTotal = splitType === 'percentage'
    ? participants.reduce((s, p) => s + (inputs[p.id] ?? 0), 0)
    : 0

  const isValid =
    description.trim() &&
    numAmount > 0 &&
    date &&
    paidBy &&
    resolvedShares.length > 0 &&
    (splitType !== 'percentage' || Math.abs(percentageTotal - 100) < 0.01)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    const payload = {
      paidByParticipantId: paidBy,
      amount: numAmount,
      description: description.trim(),
      date,
      splitType,
      shares: resolvedShares,
    }

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input: payload })
        toast.success('Expense updated')
      } else {
        await create.mutateAsync(payload)
        toast.success('Expense added')
      }
      onOpenChange(false)
    } catch {
      toast.error(editing ? 'Failed to update expense' : 'Failed to add expense')
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto p-6">
        <SheetHeader className="p-0">
          <SheetTitle>{editing ? 'Edit Expense' : 'Add Expense'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="e.g. Dinner, Hotel, Groceries"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Paid by</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger>
                <SelectValue placeholder="Who paid?" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Split type</Label>
            <Tabs value={splitType} onValueChange={(v) => handleSplitTypeChange(v as SplitType)}>
              <TabsList className="w-full">
                <TabsTrigger value="equal" className="flex-1">Equal</TabsTrigger>
                <TabsTrigger value="shares" className="flex-1">Shares</TabsTrigger>
                <TabsTrigger value="percentage" className="flex-1">%</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm font-medium truncate">{p.name}</span>

                  {splitType === 'equal' && (
                    <input
                      type="checkbox"
                      checked={inputs[p.id] !== 0}
                      onChange={(e) => setInputs((prev) => ({ ...prev, [p.id]: e.target.checked ? 1 : 0 }))}
                      className="h-4 w-4 rounded"
                    />
                  )}

                  {splitType === 'shares' && (
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="w-20 text-right"
                      value={inputs[p.id] ?? 1}
                      onChange={(e) => setInputs((prev) => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                    />
                  )}

                  {splitType === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-20 text-right"
                        value={inputs[p.id] ?? 0}
                        onChange={(e) => setInputs((prev) => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                      />
                      <span className="text-muted-foreground text-sm">%</span>
                    </div>
                  )}

                  <span className="w-20 text-right text-sm text-muted-foreground">
                    {shareMap[p.id] != null
                      ? formatCurrency(shareMap[p.id], currency, locale)
                      : '—'}
                  </span>
                </div>
              ))}
            </div>

            {splitType === 'percentage' && Math.abs(percentageTotal - 100) > 0.01 && percentageTotal > 0 && (
              <p className="text-destructive text-xs">
                Percentages must sum to 100% (currently {percentageTotal.toFixed(2)}%)
              </p>
            )}
          </div>

          <Button type="submit" disabled={!isValid || isPending}>
            {editing ? 'Save Changes' : 'Add Expense'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
