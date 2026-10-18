import type { RecurringFrequency, RecurringTransaction } from '@family/types'

/** Format a Date to YYYY-MM-DD without UTC shift */
function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Parse YYYY-MM-DD without UTC shift (per CLAUDE.md: never use new Date("YYYY-MM-DD")) */
function parseLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Advance a YYYY-MM-DD date by one frequency unit */
export function nextOccurrence(date: string, frequency: RecurringFrequency): string {
  const d = parseLocal(date)
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7)
  } else if (frequency === 'monthly') {
    // Preserve day-of-month; clamp to last day if needed (e.g. Jan 31 → Feb 28)
    const day = d.getDate()
    d.setMonth(d.getMonth() + 1, 1)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, lastDay))
  } else {
    d.setFullYear(d.getFullYear() + 1)
  }
  return toDateString(d)
}

/**
 * Returns all dates (inclusive) from nextDueDate up to and including today
 * (or endDate if it comes first) that should have generated an entry but haven't yet.
 * Capped at 24 to avoid runaway loops on very old recurring transactions.
 */
export function getMissedOccurrences(
  nextDueDate: string,
  frequency: RecurringFrequency,
  endDate?: string | null,
): string[] {
  const today = toDateString(new Date())
  const ceiling = endDate && endDate < today ? endDate : today
  const missed: string[] = []
  let cursor = nextDueDate

  while (cursor <= ceiling && missed.length < 24) {
    missed.push(cursor)
    cursor = nextOccurrence(cursor, frequency)
  }

  return missed
}

export type CatchUpItem = {
  recurring: RecurringTransaction
  missedDates: string[]
}

export type CatchUpPlan = {
  /** ≤2 missed — generate silently without asking */
  autoGenerate: CatchUpItem[]
  /** ≥3 missed — surface to the user for a decision */
  needsReview: CatchUpItem[]
}

/**
 * Splits due recurring transactions into those we auto-generate (≤2 missed)
 * and those that need the user's attention (≥3 missed).
 */
export function buildCatchUpPlan(items: RecurringTransaction[]): CatchUpPlan {
  const autoGenerate: CatchUpItem[] = []
  const needsReview: CatchUpItem[] = []

  for (const recurring of items) {
    const missed = getMissedOccurrences(recurring.nextDueDate, recurring.frequency, recurring.endDate)
    if (missed.length === 0) continue

    const item: CatchUpItem = { recurring, missedDates: missed }
    if (missed.length <= 2) {
      autoGenerate.push(item)
    } else {
      needsReview.push(item)
    }
  }

  return { autoGenerate, needsReview }
}
