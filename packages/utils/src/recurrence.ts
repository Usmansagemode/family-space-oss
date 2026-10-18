import { isSameDay } from 'date-fns'
import { RRule } from 'rrule'
import type { CalendarItem, Item } from '@family/types'

// rrule is timezone-naive and treats all dates as UTC. Normalize to UTC
// midnight so that local dates (new Date(y,m,d)) don't shift when interpreted
// as UTC in non-UTC timezones.
function toUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

function fromUTCMidnight(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/**
 * Projects all occurrences of a recurring item within [windowStart, windowEnd].
 *
 * The occurrence whose date matches the item's actual DB start_date is marked
 * isVirtual=false (real, editable). All projected occurrences are isVirtual=true.
 *
 * Note: follows RFC 5545 for month-end rollover — e.g. FREQ=MONTHLY starting
 * Jan 31 skips February (no day 31) and lands on Mar 31. This matches Google
 * Calendar behavior.
 */
export function expandRecurringItem(
  item: Item,
  windowStart: Date,
  windowEnd: Date,
): CalendarItem[] {
  if (!item.startDate || !item.recurrence || !item.familyId) return []

  const rule = new RRule({
    ...RRule.parseString(item.recurrence),
    dtstart: toUTCMidnight(item.startDate),
  })

  const originalStart = item.startDate as Date

  return rule
    .between(toUTCMidnight(windowStart), toUTCMidnight(windowEnd), true)
    .map((utcDate) => {
      const localDate = fromUTCMidnight(utcDate)
      // Preserve the original time-of-day so timed recurring items appear at the
      // correct hour. For date-only items the original hours/minutes are noon (12:00),
      // which is also preserved correctly here.
      const startDate = new Date(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate(),
        originalStart.getHours(),
        originalStart.getMinutes(),
        originalStart.getSeconds(),
      )
      return {
        ...item,
        familyId: item.familyId as string,
        startDate,
        isVirtual: !isSameDay(localDate, originalStart),
      }
    })
}
