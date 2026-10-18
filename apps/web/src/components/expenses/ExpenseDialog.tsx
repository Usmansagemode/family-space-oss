import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { ChipSelector } from '#/components/expenses/ChipSelector'
import { getCategoryIcon } from '#/lib/categoryIcons'
import type { Category, Space, ExpenseWithNames } from '@family/types'

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.number({ message: 'Amount is required' }).refine((n) => n !== 0, 'Amount cannot be zero'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: ExpenseWithNames | null
  categories: Category[]
  locationSpaces: Space[]
  personSpaces: Space[]
  onSave: (data: {
    amount: number
    date: string
    description?: string
    categoryId?: string | null
    locationId?: string | null
    paidById?: string | null
  }) => void
  isSaving?: boolean
  /** Increment to reset the form for a new entry without closing the sheet */
  resetKey?: number
  /** Default date string (YYYY-MM-DD) for new expenses. Falls back to today. */
  defaultDate?: string
  /** Pre-select a paid-by person for new expenses (e.g. the current user's person space) */
  defaultPaidById?: string | null
}

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ExpenseDialog({
  open,
  onOpenChange,
  expense,
  categories,
  locationSpaces,
  personSpaces,
  onSave,
  isSaving,
  resetKey,
  defaultDate,
  defaultPaidById,
}: Props) {
  const isEditing = !!expense

  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [paidById, setPaidById] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: '', amount: undefined, description: '' },
  })

  // Populate form when opening or switching expense
  useEffect(() => {
    if (!open) return
    if (expense) {
      reset({ date: expense.date, amount: expense.amount, description: expense.description ?? '' })
      setCategoryId(expense.categoryId ?? null)
      setLocationId(expense.locationId ?? null)
      setPaidById(expense.paidById ?? null)
    } else {
      reset({ date: defaultDate ?? todayString(), amount: undefined, description: '' })
      setCategoryId(null)
      setLocationId(null)
      setPaidById(defaultPaidById ?? null)
    }
  }, [open, expense, reset])

  // Reset form for a new entry without closing (add-another flow)
  useEffect(() => {
    if (!open || isEditing || resetKey === undefined || resetKey === 0) return
    reset({ date: defaultDate ?? todayString(), amount: undefined, description: '' })
    setCategoryId(null)
    setLocationId(null)
    setPaidById(defaultPaidById ?? null)
  }, [resetKey, open, isEditing, reset])

  function onSubmit(data: FormData) {
    onSave({
      amount: data.amount,
      date: data.date,
      description: data.description?.trim() || undefined,
      categoryId: categoryId || null,
      locationId: locationId || null,
      paidById: paidById || null,
    })
  }

  // Archived categories: show only when they are the current selection (read-only)
  const isArchivedCategory = (cat: Category) => cat.deletedAt !== null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="flex flex-col gap-5 px-6 py-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-date">Date</Label>
                <Input id="exp-date" type="date" {...register('date')} />
                {formState.errors.date && (
                  <p className="text-xs text-destructive">{formState.errors.date.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-amount">Amount</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  autoFocus
                  {...register('amount', { valueAsNumber: true })}
                />
                {formState.errors.amount && (
                  <p className="text-xs text-destructive">{formState.errors.amount.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-desc">Description</Label>
              <Input id="exp-desc" placeholder="What was this for?" {...register('description')} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Paid by</Label>
              <ChipSelector
                items={personSpaces}
                selected={paidById}
                onSelect={setPaidById}
                getColor={(s) => s.color}
                renderChip={(space) => (
                  <>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: space.color }} />
                    {space.name}
                  </>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <ChipSelector
                items={categories}
                selected={categoryId}
                onSelect={setCategoryId}
                getColor={(cat) => cat.color ?? '#888888'}
                getDisabled={isArchivedCategory}
                renderChip={(cat) => {
                  const Icon = getCategoryIcon(cat.icon)
                  return (
                    <>
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm"
                        style={{ background: `color-mix(in srgb, ${cat.color ?? '#888888'} 20%, transparent)` }}
                      >
                        <Icon className="h-2.5 w-2.5" style={{ color: cat.color ?? undefined }} />
                      </span>
                      {cat.name}
                      {cat.deletedAt && (
                        <span className="text-muted-foreground">(archived)</span>
                      )}
                    </>
                  )
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Location</Label>
              <ChipSelector
                items={locationSpaces}
                selected={locationId}
                onSelect={setLocationId}
                getColor={(s) => s.color}
                renderChip={(space) => (
                  <>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: space.color }} />
                    {space.name}
                  </>
                )}
              />
            </div>
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save changes' : 'Add expense'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
