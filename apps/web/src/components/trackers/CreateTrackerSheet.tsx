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
import { Textarea } from '#/components/ui/textarea'
import type { Tracker } from '@family/types'
import { CHART_COLORS } from '#/lib/config'

const PRESET_COLORS = [...CHART_COLORS]

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(300).optional(),
  initialBalance: z.coerce.number(),
  color: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tracker?: Tracker | null
  onSave: (data: {
    title: string
    description?: string
    initialBalance: number
    color?: string
  }) => void
  isSaving?: boolean
}

export function CreateTrackerSheet({
  open,
  onOpenChange,
  tracker,
  onSave,
  isSaving,
}: Props) {
  const isEditing = !!tracker

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, reset, watch, setValue, formState } =
    useForm<FormData>({
      resolver: zodResolver(schema) as any,
      defaultValues: {
        title: '',
        description: '',
        initialBalance: 0,
        color: PRESET_COLORS[0],
      },
    })

  const selectedColor = watch('color')

  useEffect(() => {
    if (open) {
      if (tracker) {
        reset({
          title: tracker.title,
          description: tracker.description ?? '',
          initialBalance: tracker.initialBalance,
          color: tracker.color ?? PRESET_COLORS[0],
        })
      } else {
        reset({
          title: '',
          description: '',
          initialBalance: 0,
          color: PRESET_COLORS[0],
        })
      }
    }
  }, [open, tracker, reset])

  function onSubmit(data: FormData) {
    onSave({
      title: data.title,
      description: data.description?.trim() || undefined,
      initialBalance: data.initialBalance,
      color: data.color || undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Edit Tracker' : 'New Tracker'}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tracker-title">Title</Label>
            <Input
              id="tracker-title"
              placeholder="e.g. Car loan, Emergency fund"
              autoFocus
              {...register('title')}
            />
            {formState.errors.title && (
              <p className="text-xs text-destructive">
                {formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tracker-desc">Description (optional)</Label>
            <Textarea
              id="tracker-desc"
              placeholder="What is this tracker for?"
              rows={2}
              {...register('description')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tracker-balance">Initial Balance</Label>
            <Input
              id="tracker-balance"
              type="number"
              step="0.01"
              {...register('initialBalance')}
            />
            {formState.errors.initialBalance && (
              <p className="text-xs text-destructive">
                {formState.errors.initialBalance.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className="h-8 w-8 rounded-full ring-offset-2 transition-all"
                  style={{
                    background: color,
                    outline:
                      selectedColor === color
                        ? '2px solid oklch(0.30 0.01 0)'
                        : 'none',
                    outlineOffset: '2px',
                  }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
            <Input
              placeholder="Custom OKLCH color e.g. oklch(0.60 0.15 200)"
              {...register('color')}
              className="text-xs"
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
              {isEditing ? 'Save' : 'Create'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
