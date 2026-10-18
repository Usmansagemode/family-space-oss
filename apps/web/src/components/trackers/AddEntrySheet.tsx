import { useEffect } from 'react'
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
import { formatCurrency } from '#/lib/utils'
import type { Tracker } from '@family/types'

const schema = z.object({
  date: z.string().min(1, 'Date is required'),
  debit: z.coerce.number().min(0, 'Must be 0 or more'),
  credit: z.coerce.number().min(0, 'Must be 0 or more'),
  description: z.string().max(200).optional(),
})

type FormData = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tracker: Tracker
  familyId: string
  currency?: string
  locale?: string
  onSave: (data: {
    date: string
    debit: number
    credit: number
    description?: string
  }) => void
  isSaving?: boolean
}

export function AddEntrySheet({
  open,
  onOpenChange,
  tracker,
  currency,
  locale,
  onSave,
  isSaving,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, watch, formState } = useForm<FormData>(
    {
      resolver: zodResolver(schema) as any,
      defaultValues: {
        date: '',
        debit: 0,
        credit: 0,
        description: '',
      },
    },
  )

  const debit = watch('debit') ?? 0
  const credit = watch('credit') ?? 0
  const previewBalance = tracker.currentBalance + Number(debit) - Number(credit)

  useEffect(() => {
    if (open) {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      reset({
        date: `${yyyy}-${mm}-${dd}`,
        debit: 0,
        credit: 0,
        description: '',
      })
    }
  }, [open, reset])

  function onSubmit(data: FormData) {
    onSave({
      date: data.date,
      debit: data.debit,
      credit: data.credit,
      description: data.description?.trim() || undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Add Entry — {tracker.title}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-2"
        >
          {/* Balance preview */}
          <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Current balance</p>
              <p className="font-semibold tabular-nums">
                {formatCurrency(tracker.currentBalance, currency, locale)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">After entry</p>
              <p
                className={
                  previewBalance >= 0
                    ? 'font-semibold tabular-nums text-emerald-600 dark:text-emerald-400'
                    : 'font-semibold tabular-nums text-red-600 dark:text-red-400'
                }
              >
                {formatCurrency(previewBalance, currency, locale)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entry-date">Date</Label>
            <Input id="entry-date" type="date" {...register('date')} />
            {formState.errors.date && (
              <p className="text-xs text-destructive">
                {formState.errors.date.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-debit">Money In (Debit)</Label>
              <Input
                id="entry-debit"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('debit')}
              />
              {formState.errors.debit && (
                <p className="text-xs text-destructive">
                  {formState.errors.debit.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-credit">Money Out (Credit)</Label>
              <Input
                id="entry-credit"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('credit')}
              />
              {formState.errors.credit && (
                <p className="text-xs text-destructive">
                  {formState.errors.credit.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entry-desc">Description (optional)</Label>
            <Input
              id="entry-desc"
              placeholder="e.g. Monthly payment"
              {...register('description')}
            />
          </div>

          <SheetFooter className="px-0 mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add entry
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
