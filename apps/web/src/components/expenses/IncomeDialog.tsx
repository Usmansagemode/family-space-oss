import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { cn } from '#/lib/utils'
import { ChipSelector } from '#/components/expenses/ChipSelector'
import { INCOME_TYPES } from '#/lib/income-types'
import type { IncomeEntry, IncomeType, Space } from '@family/types'

const schema = z.object({
  amount: z.number({ message: 'Amount is required' }).positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: IncomeEntry | null
  year: number
  month: number
  personSpaces: Space[]
  onSave: (data: {
    amount: number
    date: string
    description?: string
    personId: string | null
    type: IncomeType | null
  }) => void
  isSaving?: boolean
  /** Increment to reset form after a successful add without closing */
  resetKey?: number
}

function defaultDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function IncomeDialog({
  open,
  onOpenChange,
  entry,
  year,
  month,
  personSpaces,
  onSave,
  isSaving,
  resetKey,
}: Props) {
  const isEditing = !!entry

  const [personId, setPersonId] = useState<string>('')
  const [incomeType, setIncomeType] = useState<IncomeType | null>(null)

  const { register, handleSubmit, reset, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: undefined, date: '', description: '' },
  })

  // Populate form when opening or switching entry
  useEffect(() => {
    if (!open) return
    if (entry) {
      reset({ amount: entry.amount, date: entry.date, description: entry.description ?? '' })
      setPersonId(entry.personId ?? '')
      setIncomeType(entry.type)
    } else {
      reset({ amount: undefined, date: defaultDate(year, month), description: '' })
      setPersonId('')
      setIncomeType(null)
    }
  }, [open, entry, year, month, reset])

  // Reset form for a new entry without closing (add-another flow)
  useEffect(() => {
    if (!open || isEditing || resetKey === undefined || resetKey === 0) return
    reset({ amount: undefined, date: defaultDate(year, month), description: '' })
    setPersonId('')
    setIncomeType(null)
  }, [resetKey, open, isEditing, year, month, reset])

  function onSubmit(data: FormData) {
    onSave({
      amount: data.amount,
      date: data.date,
      description: data.description?.trim() || undefined,
      personId: personId || null,
      type: incomeType,
    })
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o) }}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{isEditing ? 'Edit income' : 'Log income'}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="flex flex-col gap-5 px-6 py-5">
            {/* Type chips */}
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <div className="flex flex-wrap gap-1.5">
                {INCOME_TYPES.map((t) => {
                  const Icon = t.icon
                  const selected = incomeType === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setIncomeType(selected ? null : t.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                        selected
                          ? 'shadow-sm'
                          : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground',
                      )}
                      style={selected ? {
                        background: `color-mix(in srgb, ${t.hex} 15%, transparent)`,
                        borderColor: `color-mix(in srgb, ${t.hex} 45%, transparent)`,
                        color: 'inherit',
                      } : undefined}
                    >
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm"
                        style={{ background: `color-mix(in srgb, ${t.hex} 20%, transparent)` }}
                      >
                        <Icon className="h-2.5 w-2.5" style={{ color: t.hex }} />
                      </span>
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inc-amount">Amount</Label>
                <Input
                  id="inc-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  autoFocus
                  {...register('amount', { valueAsNumber: true })}
                />
                {formState.errors.amount && (
                  <p className="text-xs text-destructive">{formState.errors.amount.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inc-date">Date</Label>
                <Input id="inc-date" type="date" {...register('date')} />
                {formState.errors.date && (
                  <p className="text-xs text-destructive">{formState.errors.date.message}</p>
                )}
              </div>
            </div>

            {personSpaces.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Person</Label>
                <ChipSelector
                  items={personSpaces}
                  selected={personId || null}
                  onSelect={(id) => setPersonId(id ?? '')}
                  getColor={(s) => s.color}
                  renderChip={(space) => (
                    <>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: space.color }} />
                      {space.name}
                    </>
                  )}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inc-desc">
                Note
                <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="inc-desc"
                placeholder="e.g. March salary, Client X"
                {...register('description')}
              />
            </div>
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save changes' : 'Log income'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
