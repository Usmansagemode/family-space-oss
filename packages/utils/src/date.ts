import { RRule } from 'rrule'
import type { Recurrence } from '@family/types'

/** Parse a YYYY-MM-DD date string into a local Date object without UTC shift. */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export type DateStatus = 'overdue' | 'today' | 'soon' | 'future' | null

export function getDateStatus(date: Date): DateStatus {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round(
    (dateDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays <= 2) return 'soon'
  return 'future'
}

// rrule is timezone-naive — normalize to UTC midnight to avoid date shifts.
function toUTCMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

/** Returns the next occurrence of a recurring item strictly after `date`.
 *  Preserves the original hours/minutes/seconds so timed items stay timed
 *  and date-only items (noon sentinel) stay date-only after the advance. */
export function advanceDate(date: Date, recurrence: Recurrence): Date {
  const utc = toUTCMidnight(date)
  const rule = new RRule({
    ...RRule.parseString(recurrence),
    dtstart: utc,
  })
  const next = rule.after(utc, false)
  if (!next) return date
  return new Date(
    next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate(),
    date.getHours(), date.getMinutes(), date.getSeconds(),
  )
}
