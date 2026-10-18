import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { format, isToday, isTomorrow } from 'date-fns'
import { Check, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { completeItem } from '@family/supabase'
import { useUpcomingTimeline, upcomingTimelineQueryKey } from '@family/hooks'
import type { UpcomingTimelineResult } from '@family/hooks'
import type { CalendarItem } from '@family/types'
import { SPACE_COLORS } from '@family/config'
import { hasExplicitTime, formatTime } from '@family/utils'
import { useSpaces } from '#/hooks/spaces/useSpaces'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'

interface Props {
  familyId: string
}

function getDayLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'EEE, MMM d')
}

export function UpcomingTimeline({ familyId }: Props) {
  const { data, isLoading } = useUpcomingTimeline(familyId)
  const { data: spaces = [] } = useSpaces(familyId)
  const queryClient = useQueryClient()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const spaceColorById = useMemo(
    () => new Map(spaces.map((s) => [s.id, s.color])),
    [spaces],
  )

  // todayKey is stable because useUpcomingTimeline derives it from a useMemo'd `today`.
  // We need the same key here for optimistic updates — read it from the query data's
  // cache key prefix so we never recompute it independently.
  const todayKey = format(new Date(), 'yyyy-MM-dd')

  const complete = useMutation<CalendarItem, Error, CalendarItem, { prev?: UpcomingTimelineResult }>({
    mutationFn: (item) => completeItem(item.id) as Promise<CalendarItem>,
    onMutate: async (item) => {
      setPendingId(item.id)
      const key = upcomingTimelineQueryKey(familyId, todayKey)
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData<UpcomingTimelineResult>(key)
      queryClient.setQueryData<UpcomingTimelineResult>(key, (old) => {
        if (!old || old.kind !== 'days') return old
        return {
          kind: 'days',
          days: old.days.map((day) => ({
            ...day,
            items: day.items.filter((i) => i.id !== item.id),
          })),
        }
      })
      return { prev }
    },
    onSuccess: (_data, item) => {
      if (item.googleEventId) {
        toast.success('Marked as done — remove the event from Google Calendar manually')
      } else {
        toast.success('Marked as done')
      }
    },
    onError: (_err, _item, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(upcomingTimelineQueryKey(familyId, todayKey), ctx.prev)
      toast.error('Failed to complete item')
    },
    onSettled: (_data, _err, item) => {
      setPendingId(null)
      void queryClient.invalidateQueries({ queryKey: ['upcoming-timeline', familyId] })
      void queryClient.invalidateQueries({ queryKey: ['calendar-items'] })
      void queryClient.invalidateQueries({ queryKey: ['items', item.spaceId] })
    },
  })

  if (isLoading) {
    return (
      <div className="print:hidden">
        <div className="hidden md:grid md:grid-cols-7 md:gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ))}
        </div>
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-6 w-6 flex-shrink-0 rounded-full" />
              <Skeleton className="h-12 flex-1 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (data?.kind === 'next') {
    const item = data.item
    return (
      <div className="flex items-center justify-center rounded-xl border bg-card p-4 text-sm text-muted-foreground print:hidden">
        {item && item.startDate
          ? `Next up: ${item.title} · ${getDayLabel(item.startDate)}`
          : 'Nothing scheduled'}
      </div>
    )
  }

  if (!data || data.kind !== 'days') {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-card p-4 text-sm text-muted-foreground print:hidden">
        Nothing scheduled
      </div>
    )
  }

  const { days } = data

  return (
    <div className="print:hidden">
      {/* Desktop: horizontal 7-column grid */}
      <div className="relative hidden md:block">
        {/* Horizontal connector line — bisects the h-6 (24px) nodes */}
        <div className="absolute left-0 right-0 top-3 h-px bg-border" />
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const todayNode = isToday(day.date)
            const empty = day.items.length === 0
            return (
              <motion.div
                key={format(day.date, 'yyyy-MM-dd')}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="flex min-w-0 flex-col items-center gap-1.5"
              >
                <div
                  className={cn(
                    'relative z-10 h-6 w-6 rounded-full border-2',
                    todayNode
                      ? 'border-primary bg-primary'
                      : empty
                        ? 'border-muted bg-muted'
                        : 'border-border bg-background',
                  )}
                />
                <p
                  className={cn(
                    'w-full text-center text-[11px] leading-tight',
                    todayNode
                      ? 'font-semibold text-foreground'
                      : empty
                        ? 'text-muted-foreground/40'
                        : 'text-muted-foreground',
                  )}
                >
                  {getDayLabel(day.date)}
                </p>
                <div className="w-full space-y-1">
                  {day.items.map((item) => (
                    <DesktopItemRow
                      key={item.id + (item.isVirtual ? '-v' : '')}
                      item={item}
                      spaceColor={spaceColorById.get(item.spaceId) ?? SPACE_COLORS[0]}
                      pending={pendingId === item.id}
                      onComplete={() => complete.mutate(item)}
                    />
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Mobile: vertical timeline */}
      <div className="relative md:hidden">
        <div className="absolute bottom-0 left-3 top-0 w-px bg-border" />
        <div className="space-y-3">
          {days.map((day, i) => {
            const todayNode = isToday(day.date)
            const empty = day.items.length === 0
            return (
              <motion.div
                key={format(day.date, 'yyyy-MM-dd')}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="flex gap-3"
              >
                <div
                  className={cn(
                    'relative z-10 mt-0.5 h-6 w-6 flex-shrink-0 rounded-full border-2',
                    todayNode
                      ? 'border-primary bg-primary'
                      : empty
                        ? 'border-muted bg-muted'
                        : 'border-border bg-background',
                  )}
                />
                <div className="min-w-0 flex-1 pb-1">
                  <p
                    className={cn(
                      'text-sm leading-tight',
                      todayNode
                        ? 'font-semibold text-foreground'
                        : empty
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground',
                    )}
                  >
                    {getDayLabel(day.date)}
                  </p>
                  {empty ? (
                    <p className="text-xs text-muted-foreground/30">—</p>
                  ) : (
                    <div className="mt-1.5 space-y-1">
                      {day.items.map((item) => (
                        <MobileItemRow
                          key={item.id + (item.isVirtual ? '-v' : '')}
                          item={item}
                          spaceColor={spaceColorById.get(item.spaceId) ?? SPACE_COLORS[0]}
                          pending={pendingId === item.id}
                          onComplete={() => complete.mutate(item)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface ItemRowProps {
  item: CalendarItem
  spaceColor: string
  pending: boolean
  onComplete: () => void
}

function DesktopItemRow({ item, spaceColor, pending, onComplete }: ItemRowProps) {
  return (
    <div
      className="flex min-w-0 items-center gap-1 overflow-hidden rounded-md bg-muted/40 px-1.5 py-1 transition-colors hover:bg-muted/70"
      style={{ borderLeft: `2px solid ${spaceColor}` }}
    >
      <span className="flex-1 truncate text-[11px] font-medium leading-tight">{item.title}</span>
      {item.startDate && hasExplicitTime(item.startDate) && (
        <span className="hidden flex-shrink-0 text-[10px] text-muted-foreground lg:inline">
          {formatTime(item.startDate)}
        </span>
      )}
      {item.recurrence ? (
        <RotateCcw className="h-2.5 w-2.5 flex-shrink-0 text-muted-foreground/50" />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 flex-shrink-0 text-muted-foreground/60 hover:text-green-600"
          disabled={pending}
          onClick={onComplete}
        >
          <Check className="h-2.5 w-2.5" />
        </Button>
      )}
    </div>
  )
}

function MobileItemRow({ item, spaceColor, pending, onComplete }: ItemRowProps) {
  return (
    <div
      className="flex min-w-0 items-center gap-2 overflow-hidden rounded-md bg-muted/40 px-2 py-1.5 transition-colors hover:bg-muted/70"
      style={{ borderLeft: `2px solid ${spaceColor}` }}
    >
      <span className="flex-1 truncate text-sm leading-snug">{item.title}</span>
      {item.startDate && hasExplicitTime(item.startDate) && (
        <span className="flex-shrink-0 text-xs text-muted-foreground">
          {formatTime(item.startDate)}
        </span>
      )}
      {item.recurrence ? (
        <RotateCcw className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0 text-muted-foreground/60 hover:text-green-600"
          disabled={pending}
          onClick={onComplete}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
