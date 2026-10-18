import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Category, RecurringTransaction, Space } from '@family/types'
import { useRecurringTransactionMutations } from '#/hooks/expenses/useRecurringTransactionMutations'
import { INCOME_TYPES } from '#/lib/income-types'
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Props = {
  familyId: string
  categories: Category[]
  personSpaces: Space[]
  locationSpaces: Space[]
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: RecurringTransaction
  onSaved?: (updated: RecurringTransaction) => void
}

const FREQUENCY_LABELS: Record<RecurringTransaction['frequency'], string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

export function RecurringTransactionDialog({
  familyId,
  categories,
  personSpaces,
  locationSpaces,
  open,
  onOpenChange,
  editing,
  onSaved,
}: Props) {
  const { create, update } = useRecurringTransactionMutations(familyId)

  const [direction, setDirection] = useState<'expense' | 'income'>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<RecurringTransaction['frequency']>('monthly')
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState('')
  // expense fields
  const [categoryId, setCategoryId] = useState<string>('none')
  const [locationId, setLocationId] = useState<string>('none')
  const [paidById, setPaidById] = useState<string>('none')
  // income fields
  const [personId, setPersonId] = useState<string>('none')
  const [incomeType, setIncomeType] = useState<string>('none')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setDirection(editing.direction)
      setDescription(editing.description)
      setAmount(String(editing.amount))
      setFrequency(editing.frequency)
      setStartDate(editing.startDate)
      setEndDate(editing.endDate ?? '')
      setCategoryId(editing.categoryId ?? 'none')
      setLocationId(editing.locationId ?? 'none')
      setPaidById(editing.paidById ?? 'none')
      setPersonId(editing.personId ?? 'none')
      setIncomeType(editing.incomeType ?? 'none')
    } else {
      setDirection('expense')
      setDescription('')
      setAmount('')
      setFrequency('monthly')
      setStartDate(today())
      setEndDate('')
      setCategoryId('none')
      setLocationId('none')
      setPaidById('none')
      setPersonId('none')
      setIncomeType('none')
    }
  }, [open, editing])

  const numAmount = parseFloat(amount) || 0
  const isValid = description.trim() && numAmount > 0 && startDate

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    // If start date was moved earlier than the current nextDueDate, backfill from the new startDate
    const nextDueDate =
      editing && startDate < editing.nextDueDate ? startDate : (editing ? editing.nextDueDate : startDate)

    const payload = {
      direction,
      description: description.trim(),
      amount: numAmount,
      frequency,
      startDate,
      nextDueDate,
      endDate: endDate || null,
      // expense fields
      categoryId: direction === 'expense' && categoryId !== 'none' ? categoryId : null,
      locationId: direction === 'expense' && locationId !== 'none' ? locationId : null,
      paidById: direction === 'expense' && paidById !== 'none' ? paidById : null,
      // income fields
      personId: direction === 'income' && personId !== 'none' ? personId : null,
      incomeType:
        direction === 'income' && incomeType !== 'none'
          ? (incomeType as RecurringTransaction['incomeType'])
          : null,
    }

    try {
      if (editing) {
        const updated = await update.mutateAsync({ id: editing.id, ...payload })
        toast.success('Recurring transaction updated')
        onSaved?.(updated)
      } else {
        await create.mutateAsync(payload)
        toast.success('Recurring transaction created')
      }
      onOpenChange(false)
    } catch {
      toast.error(editing ? 'Failed to update' : 'Failed to create recurring transaction')
    }
  }

  const isExpense = direction === 'expense'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto p-6">
        <SheetHeader className="p-0">
          <SheetTitle>
            {editing ? 'Edit Recurring' : 'New Recurring'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">

          {/* Direction toggle — disabled when editing */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['expense', 'income'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={!!editing}
                  onClick={() => setDirection(d)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    direction === d
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-transparent text-muted-foreground hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
                  }`}
                >
                  {d === 'expense' ? 'Expense' : 'Income'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder={isExpense ? 'e.g. Netflix, Rent, Gym' : 'e.g. Salary, Freelance retainer'}
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
              <Label>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as RecurringTransaction['frequency'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FREQUENCY_LABELS) as RecurringTransaction['frequency'][]).map(
                    (f) => (
                      <SelectItem key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>
                End date{' '}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          {!editing && startDate && (
            <p className="text-muted-foreground text-xs">
              First {isExpense ? 'expense' : 'income entry'} on{' '}
              <span className="font-medium text-foreground">{startDate}</span>, then every{' '}
              {FREQUENCY_LABELS[frequency].toLowerCase()} after that.
            </p>
          )}

          {/* Expense-only fields */}
          {isExpense && (
            <>
              <div className="space-y-2">
                <Label>
                  Category <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Location <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No location</SelectItem>
                    {locationSpaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Paid by <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Select value={paidById} onValueChange={setPaidById}>
                  <SelectTrigger>
                    <SelectValue placeholder="No one selected" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No one selected</SelectItem>
                    {personSpaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Income-only fields */}
          {!isExpense && (
            <>
              <div className="space-y-2">
                <Label>
                  Income type <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Select value={incomeType} onValueChange={setIncomeType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No type</SelectItem>
                    {INCOME_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Person <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Select value={personId} onValueChange={setPersonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No one selected" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No one selected</SelectItem>
                    {personSpaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <SheetFooter className="p-0 mt-2">
            <Button
              type="submit"
              disabled={!isValid || create.isPending || update.isPending}
              className="w-full"
            >
              {editing ? 'Save Changes' : `Create Recurring ${isExpense ? 'Expense' : 'Income'}`}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
