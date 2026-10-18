import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchNonRecurringCalendarItems, fetchRecurringCalendarItems } from '@family/supabase'
import { expandRecurringItem } from '@family/utils'
import type { CalendarItem, Item } from '@family/types'

/** Returns the two query keys used by useCalendarItems for a given window.
 *  Use this in prefetchQuery calls to avoid key drift between the hook and consumers. */
export function calendarItemsQueryKeys(familyId: string, windowStart: Date, windowEnd: Date) {
  const startKey = format(windowStart, 'yyyy-MM-dd')
  const endKey = format(windowEnd, 'yyyy-MM-dd')
  return {
    nonRecurring: ['calendar-items', 'non-recurring', familyId, startKey, endKey] as const,
    recurring: ['calendar-items', 'recurring', familyId, endKey] as const,
  }
}

export function useCalendarItems(
  familyId: string,
  windowStart: Date,
  windowEnd: Date,
) {
  const startKey = format(windowStart, 'yyyy-MM-dd')
  const endKey = format(windowEnd, 'yyyy-MM-dd')

  const [nonRecurring, recurring] = useQueries({
    queries: [
      {
        queryKey: ['calendar-items', 'non-recurring', familyId, startKey, endKey],
        queryFn: () => fetchNonRecurringCalendarItems(familyId, windowStart, windowEnd),
        enabled: !!familyId,
        staleTime: 1000 * 60 * 2,
      },
      {
        queryKey: ['calendar-items', 'recurring', familyId, endKey],
        queryFn: () => fetchRecurringCalendarItems(familyId, windowEnd),
        enabled: !!familyId,
        staleTime: 1000 * 60 * 2,
      },
    ],
  })

  const isLoading = nonRecurring.isLoading || recurring.isLoading
  const error = nonRecurring.error ?? recurring.error ?? null

  const data = useMemo<CalendarItem[]>(() => [
    ...(nonRecurring.data ?? [])
      .filter((item): item is Item & { familyId: string } => !!item.familyId)
      .map((item) => ({ ...item, isVirtual: false as const })),
    ...(recurring.data ?? []).flatMap((item) =>
      expandRecurringItem(item, windowStart, windowEnd),
    ),
  ], [nonRecurring.data, recurring.data, windowStart, windowEnd])

  return { data, isLoading, error }
}
