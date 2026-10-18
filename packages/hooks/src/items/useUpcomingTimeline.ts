import { useMemo } from 'react'
import { format, isSameDay } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { fetchNonRecurringCalendarItems, fetchRecurringCalendarItems, fetchNextItemAfter } from '@family/supabase'
import { expandRecurringItem } from '@family/utils'
import type { CalendarItem, Item } from '@family/types'

export type TimelineDay = {
  date: Date
  items: CalendarItem[]
}

export type UpcomingTimelineResult =
  | { kind: 'days'; days: TimelineDay[] }
  | { kind: 'next'; item: Item | null }

export function upcomingTimelineQueryKey(familyId: string, todayKey: string) {
  return ['upcoming-timeline', familyId, todayKey] as const
}

export function useUpcomingTimeline(familyId: string) {
  // Computed once per mount so all derived values (key, queryFn, optimistic updates)
  // share the same "today" reference and don't drift across midnight.
  const today = useMemo(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), n.getDate())
  }, [])

  const todayKey = format(today, 'yyyy-MM-dd')

  return useQuery({
    queryKey: upcomingTimelineQueryKey(familyId, todayKey),
    queryFn: async (): Promise<UpcomingTimelineResult> => {
      // today+6 = 7 days inclusive (today is day 0)
      const windowEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6)

      const [nonRecurring, recurringBase] = await Promise.all([
        fetchNonRecurringCalendarItems(familyId, today, windowEnd),
        fetchRecurringCalendarItems(familyId, windowEnd),
      ])

      const calendarItems: CalendarItem[] = [
        ...nonRecurring
          .filter((item): item is Item & { familyId: string } => !!item.familyId)
          .map((item) => ({ ...item, isVirtual: false as const })),
        ...recurringBase.flatMap((item) => expandRecurringItem(item, today, windowEnd)),
      ]

      const days: TimelineDay[] = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
        return {
          date,
          items: calendarItems
            .filter((item) => item.startDate != null && isSameDay(item.startDate, date))
            .sort((a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0)),
        }
      })

      if (days.some((d) => d.items.length > 0)) {
        return { kind: 'days', days }
      }

      const windowEndStr = format(windowEnd, 'yyyy-MM-dd')
      const next = await fetchNextItemAfter(familyId, windowEndStr)
      return { kind: 'next', item: next[0] ?? null }
    },
    enabled: !!familyId,
    staleTime: 2 * 60 * 1000,
  })
}
