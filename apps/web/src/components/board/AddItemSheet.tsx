import { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarIcon, Clock, Loader2, Hash, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { extractHue, cn, hasExplicitTime } from '#/lib/utils'
import { useIsDark } from '#/hooks/useIsDark'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { useItems } from '#/hooks/items/useItems'
import { useSpaces } from '#/hooks/spaces/useSpaces'
import type { Item, Recurrence } from '#/entities/Item'
import type { SpaceType } from '#/entities/Space'

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'FREQ=DAILY', label: 'Daily' },
  { value: 'FREQ=WEEKLY', label: 'Weekly' },
  { value: 'FREQ=MONTHLY', label: 'Monthly' },
  { value: 'FREQ=YEARLY', label: 'Yearly' },
]

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(500).optional(),
  quantity: z.string().max(50).optional(),
})
type FormData = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  spaceName: string
  spaceType: SpaceType
  spaceColor?: string
  familyId?: string
  editItem?: Item
  onCreate: (input: {
    title: string
    description?: string
    quantity?: string
    startDate?: Date
    endDate?: Date
    recurrence?: Recurrence
  }) => void
  onUpdate?: (input: {
    id: string
    title: string
    description?: string
    quantity?: string | null
    startDate?: Date
    endDate?: Date
    recurrence?: Recurrence | null
  }) => void
  onComplete?: (item: Item) => void
  onDelete?: (item: Item) => void
  onMove?: (newSpaceId: string) => void
  isPending: boolean
  /** Pre-fills date/time when creating a new item (e.g. from calendar click). Rounded down to the hour. */
  initialDate?: Date
  /** Optional banner rendered below the sheet header (e.g. recurring-item warning). */
  note?: string
}

export function AddItemSheet({
  open,
  onOpenChange,
  spaceId,
  spaceName,
  spaceType,
  spaceColor,
  familyId,
  editItem,
  initialDate,
  onCreate,
  onUpdate,
  onComplete,
  onDelete,
  onMove,
  isPending,
  note,
}: Props) {
  const isStore = spaceType === 'store'
  const isEditing = !!editItem
  const [moveToSpaceId, setMoveToSpaceId] = useState('')
  const isDark = useIsDark()
  const hue = spaceColor ? extractHue(spaceColor) : null
  const accentColor = hue
    ? isDark
      ? `oklch(0.62 0.16 ${hue})`
      : `oklch(0.68 0.14 ${hue})`
    : undefined

  const { data: allSpaces } = useSpaces(familyId ?? '')
  const otherSpaces = (allSpaces ?? []).filter(
    (s) => s.type === spaceType && s.id !== spaceId,
  )

  const [startDate, setStartDate] = useState<Date | undefined>(
    editItem?.startDate,
  )
  const [endDate, setEndDate] = useState<Date | undefined>(editItem?.endDate)
  const [recurrence, setRecurrence] = useState<Recurrence | null>(
    editItem?.recurrence ?? null,
  )
  const [startTimeStr, setStartTimeStr] = useState(
    editItem?.startDate && hasExplicitTime(editItem.startDate)
      ? format(editItem.startDate, 'HH:mm')
      : '',
  )
  const [endTimeStr, setEndTimeStr] = useState(
    editItem?.endDate && hasExplicitTime(editItem.endDate)
      ? format(editItem.endDate, 'HH:mm')
      : '',
  )
  const [startOpen, setStartOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [lastAddedTitle, setLastAddedTitle] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState, watch, setValue } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        title: editItem?.title ?? '',
        description: editItem?.description ?? '',
        quantity: editItem?.quantity ?? '',
      },
    })

  const titleValue = watch('title')
  const titleField = register('title', {
    onChange: () => setLastAddedTitle(null),
  })

  // Pull completed items from cache (already loaded by SpaceColumn)
  const { data: allItems } = useItems(spaceId)

  // Deduplicated history: one entry per unique title (case-insensitive), newest first
  const suggestions = useMemo(() => {
    if (!allItems || isEditing) return []
    const seen = new Set<string>()
    return allItems
      .filter((i) => i.completed)
      .sort(
        (a, b) =>
          (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
      )
      .filter((i) => {
        const key = i.title.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .filter(
        (i) =>
          !titleValue.trim() ||
          i.title.toLowerCase().includes(titleValue.toLowerCase()),
      )
      .slice(0, 6)
  }, [allItems, titleValue, isEditing])

  useEffect(() => {
    if (open) {
      reset({
        title: editItem?.title ?? '',
        description: editItem?.description ?? '',
        quantity: editItem?.quantity ?? '',
      })
      const rawInitial = initialDate
        ? new Date(new Date(initialDate).setMinutes(0, 0, 0))
        : undefined
      const resolvedStart = editItem?.startDate ?? rawInitial
      setStartDate(resolvedStart)
      setEndDate(editItem?.endDate)
      setStartTimeStr(
        resolvedStart && hasExplicitTime(resolvedStart)
          ? format(resolvedStart, 'HH:mm')
          : '',
      )
      setEndTimeStr(
        editItem?.endDate && hasExplicitTime(editItem.endDate)
          ? format(editItem.endDate, 'HH:mm')
          : '',
      )
      setRecurrence(editItem?.recurrence ?? null)
      setMoveToSpaceId('')
      setLastAddedTitle(null)
      // Show suggestions immediately when creating (not editing)
      setShowSuggestions(!editItem)
    }
  }, [open, editItem, initialDate, reset])

  function onSubmit(data: FormData) {
    const description = data.description?.trim() || undefined
    const quantity = isStore ? data.quantity?.trim() || undefined : undefined
    if (editItem && onUpdate) {
      onUpdate({
        id: editItem.id,
        title: data.title,
        description,
        quantity: isStore ? (quantity ?? null) : undefined,
        startDate: isStore ? undefined : startDate,
        endDate: isStore ? undefined : endDate,
        recurrence: isStore ? undefined : (recurrence ?? null),
      })
      // Sheet stays open — parent closes it in mutation's onSuccess
    } else {
      const addedTitle = data.title
      onCreate({
        title: addedTitle,
        description,
        quantity,
        startDate: isStore ? undefined : startDate,
        endDate: isStore ? undefined : endDate,
        recurrence: isStore ? undefined : (recurrence ?? undefined),
      })
      // Quick-add: reset form and stay open for the next item
      reset({ title: '', description: '', quantity: '' })
      setStartDate(undefined)
      setEndDate(undefined)
      setStartTimeStr('')
      setEndTimeStr('')
      setLastAddedTitle(addedTitle)
      setShowSuggestions(true)
    }
  }

  const handleComplete = useCallback(() => {
    if (editItem && onComplete) {
      onComplete(editItem)
      // Sheet stays open — parent closes it in mutation's onSuccess
    }
  }, [editItem, onComplete])

  function handleDelete() {
    if (editItem && onDelete) {
      onDelete(editItem)
      // Sheet stays open — parent closes it in mutation's onSuccess
    }
  }

  function pickSuggestion(title: string) {
    setValue('title', title, { shouldValidate: true })
    setShowSuggestions(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex max-w-sm flex-col gap-0 p-0">
        {accentColor && (
          <div
            className="h-1 w-full shrink-0"
            style={{ background: accentColor }}
          />
        )}
        <SheetHeader className="border-b border-border p-6">
          <SheetTitle>
            {isEditing ? editItem.title : `Add to ${spaceName}`}
          </SheetTitle>
        </SheetHeader>

        {note && (
          <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
            {note}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-5 overflow-y-auto p-6"
        >
          {/* Title + history suggestions */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-title">Title</Label>
            <Input
              id="item-title"
              placeholder="What needs doing?"
              autoFocus
              autoComplete="off"
              {...titleField}
              onFocus={() => setShowSuggestions(true)}
              onBlur={(e) => {
                void titleField.onBlur(e)
                // Small delay so onMouseDown on suggestions fires first
                setTimeout(() => setShowSuggestions(false), 120)
              }}
            />
            {formState.errors.title && (
              <p className="text-xs text-destructive">
                {formState.errors.title.message}
              </p>
            )}

            {/* History suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="overflow-hidden rounded-md border border-border bg-popover shadow-md">
                <p className="border-b border-border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  From history
                </p>
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      pickSuggestion(item.title)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-accent"
                  >
                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity — store spaces only */}
          {isStore && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="item-qty">Quantity (optional)</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="item-qty"
                  placeholder="e.g. 2, 500g, 1 dozen"
                  className="pl-9"
                  {...register('quantity')}
                />
              </div>
            </div>
          )}

          {/* Start date + time — person spaces only */}
          {!isStore && (
            <div className="flex flex-col gap-2">
              <Label>Date (optional)</Label>
              <div className="flex gap-2">
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'flex-1 justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate
                        ? format(startDate, 'MMM d, yyyy')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <input
                      type="date"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const d = new Date(e.target.value + 'T12:00:00')
                          if (startTimeStr) {
                            const [h, m] = startTimeStr.split(':').map(Number)
                            d.setHours(h, m, 0, 0)
                          }
                          setStartDate(d)
                        } else {
                          setStartDate(undefined)
                          setEndDate(undefined)
                          setStartTimeStr('')
                          setEndTimeStr('')
                        }
                        setStartOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {startDate && (
                  <input
                    type="time"
                    className="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-36 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
                    value={startTimeStr}
                    onChange={(e) => {
                      const t = e.target.value
                      setStartTimeStr(t)
                      const updated = new Date(startDate)
                      if (t) {
                        const [h, m] = t.split(':').map(Number)
                        updated.setHours(h, m, 0, 0)
                      } else {
                        updated.setHours(12, 0, 0, 0)
                      }
                      setStartDate(updated)
                    }}
                  />
                )}
              </div>
              {startDate && (
                <button
                  type="button"
                  className="self-start text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setStartDate(undefined)
                    setEndDate(undefined)
                    setStartTimeStr('')
                    setEndTimeStr('')
                    setRecurrence(null)
                  }}
                >
                  Clear date
                </button>
              )}
            </div>
          )}

          {/* End date + time — person spaces only, shown if start date is set */}
          {!isStore && startDate && (
            <div className="flex flex-col gap-2">
              <Label>End date / time (optional)</Label>
              <div className="flex gap-2">
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'flex-1 justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'MMM d, yyyy') : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <input
                      type="date"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                      min={format(startDate, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        if (e.target.value) {
                          const d = new Date(e.target.value + 'T12:00:00')
                          if (endTimeStr) {
                            const [h, m] = endTimeStr.split(':').map(Number)
                            d.setHours(h, m, 0, 0)
                          }
                          setEndDate(d)
                        } else {
                          setEndDate(undefined)
                          setEndTimeStr('')
                        }
                        setEndOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {endDate && (
                  <input
                    type="time"
                    className="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-36 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
                    value={endTimeStr}
                    onChange={(e) => {
                      const t = e.target.value
                      setEndTimeStr(t)
                      const updated = new Date(endDate)
                      if (t) {
                        const [h, m] = t.split(':').map(Number)
                        updated.setHours(h, m, 0, 0)
                      } else {
                        updated.setHours(12, 0, 0, 0)
                      }
                      setEndDate(updated)
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Recurrence — person spaces only, when a date is set */}
          {!isStore && startDate && (
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 opacity-60" />
                Repeats
              </Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setRecurrence(null)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                    recurrence === null
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  None
                </button>
                {RECURRENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecurrence(opt.value)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition',
                      recurrence === opt.value
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Move to space — edit mode only, when other same-type spaces exist */}
          {isEditing && onMove && otherSpaces.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Move to space</Label>
              <div className="flex flex-wrap gap-2">
                {otherSpaces.map((s) => {
                  const selected = moveToSpaceId === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setMoveToSpaceId(selected ? '' : s.id)}
                      className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all"
                      style={{
                        background: s.color,
                        borderColor: selected
                          ? 'oklch(0.30 0.01 0)'
                          : 'transparent',
                        outline: selected
                          ? '2px solid oklch(0.30 0.01 0 / 0.15)'
                          : 'none',
                        outlineOffset: '2px',
                      }}
                    >
                      {s.name}
                    </button>
                  )
                })}
              </div>
              {moveToSpaceId && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onMove(moveToSpaceId)}
                  disabled={isPending}
                  className="self-start"
                >
                  Move to{' '}
                  {otherSpaces.find((s) => s.id === moveToSpaceId)?.name}
                </Button>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-desc">Notes (optional)</Label>
            <Textarea
              id="item-desc"
              placeholder="Any extra details…"
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="mt-auto flex flex-col gap-2">
            {isEditing && onComplete && (
              <Button
                type="button"
                variant="success"
                className="w-full"
                onClick={handleComplete}
                disabled={isPending}
              >
                {editItem.recurrence ? 'Done & Reschedule' : 'Mark as Done'}
              </Button>
            )}
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive/5"
                onClick={handleDelete}
                disabled={isPending}
              >
                Delete
              </Button>
            )}

            {/* Inline confirmation for quick-add */}
            {!isEditing && lastAddedTitle && (
              <p className="text-center text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  "{lastAddedTitle}"
                </span>{' '}
                added
              </p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                {isEditing ? 'Cancel' : 'Done'}
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? 'Save' : 'Add'}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
