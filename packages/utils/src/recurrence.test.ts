import { describe, it, expect } from 'vitest'
import { expandRecurringItem } from './recurrence'
import type { Item } from '@family/types'

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    familyId: 'family-1',
    spaceId: 'space-1',
    title: 'Test',
    recurrence: 'FREQ=WEEKLY',
    startDate: new Date(2026, 0, 5), // Monday Jan 5 2026
    sortOrder: 0,
    completed: false,
    createdAt: new Date(2026, 0, 5),
    updatedAt: new Date(2026, 0, 5),
    ...overrides,
  }
}

const windowStart = new Date(2026, 1, 16) // Mon Feb 16 2026
const windowEnd = new Date(2026, 1, 22)   // Sun Feb 22 2026

describe('expandRecurringItem', () => {
  it('returns occurrences within window for item starting 6 weeks ago', () => {
    const item = makeItem({ recurrence: 'FREQ=WEEKLY' }) // started Jan 5
    const result = expandRecurringItem(item, windowStart, windowEnd)

    expect(result.length).toBe(1)
    expect(result[0].startDate?.getDate()).toBe(16) // Feb 16
    expect(result[0].isVirtual).toBe(true) // not the original start_date
  })

  it('marks the occurrence matching start_date as non-virtual', () => {
    const item = makeItem({
      recurrence: 'FREQ=WEEKLY',
      startDate: new Date(2026, 1, 16), // Feb 16 — inside the window
    })
    const result = expandRecurringItem(item, windowStart, windowEnd)

    const real = result.find((r) => !r.isVirtual)
    expect(real).toBeDefined()
    expect(real?.startDate?.getDate()).toBe(16)
  })

  it('returns multiple occurrences for daily recurrence', () => {
    const item = makeItem({
      recurrence: 'FREQ=DAILY',
      startDate: new Date(2026, 1, 10), // Feb 10 — before window
    })
    const result = expandRecurringItem(item, windowStart, windowEnd)

    expect(result.length).toBe(7) // Feb 16–22
    expect(result.every((r) => r.isVirtual)).toBe(true)
  })

  it('returns empty array when item start_date is after window', () => {
    const item = makeItem({
      recurrence: 'FREQ=WEEKLY',
      startDate: new Date(2026, 2, 1), // Mar 1 — after window
    })
    const result = expandRecurringItem(item, windowStart, windowEnd)
    expect(result.length).toBe(0)
  })

  it('returns empty array when item has no startDate', () => {
    const item = makeItem({ startDate: undefined })
    const result = expandRecurringItem(item, windowStart, windowEnd)
    expect(result.length).toBe(0)
  })

  it('returns empty array when item has no familyId', () => {
    const item = makeItem({ familyId: undefined })
    const result = expandRecurringItem(item, windowStart, windowEnd)
    expect(result.length).toBe(0)
  })

  it('handles monthly recurrence correctly', () => {
    const item = makeItem({
      recurrence: 'FREQ=MONTHLY',
      startDate: new Date(2025, 11, 16), // Dec 16 2025
    })
    const result = expandRecurringItem(item, windowStart, windowEnd)

    expect(result.length).toBe(1)
    expect(result[0].startDate?.getMonth()).toBe(1) // February
    expect(result[0].startDate?.getDate()).toBe(16)
  })

  it('propagates familyId onto every occurrence', () => {
    const item = makeItem({ recurrence: 'FREQ=DAILY', startDate: new Date(2026, 1, 10) })
    const result = expandRecurringItem(item, windowStart, windowEnd)
    expect(result.every((r) => r.familyId === 'family-1')).toBe(true)
  })

  it('includes occurrence exactly on windowStart (inclusive)', () => {
    const item = makeItem({ recurrence: 'FREQ=WEEKLY', startDate: new Date(2026, 1, 16) })
    const result = expandRecurringItem(item, windowStart, windowEnd)
    expect(result.some((r) => r.startDate?.getDate() === 16)).toBe(true)
  })

  it('includes occurrence exactly on windowEnd (inclusive)', () => {
    const item = makeItem({ recurrence: 'FREQ=WEEKLY', startDate: new Date(2026, 1, 22) })
    const result = expandRecurringItem(item, windowStart, windowEnd)
    expect(result.some((r) => r.startDate?.getDate() === 22)).toBe(true)
  })

  it('returns empty when start_date has been advanced past windowEnd', () => {
    const item = makeItem({
      recurrence: 'FREQ=WEEKLY',
      startDate: new Date(2026, 2, 1), // Mar 1 — past this Feb window
    })
    const result = expandRecurringItem(item, windowStart, windowEnd)
    expect(result.length).toBe(0)
  })

  it('handles monthly rollover from Jan 31 correctly', () => {
    const jan31 = new Date(2026, 0, 31)
    const marchStart = new Date(2026, 2, 1)
    const marchEnd = new Date(2026, 2, 31)
    const item = makeItem({ recurrence: 'FREQ=MONTHLY', startDate: jan31 })
    const result = expandRecurringItem(item, marchStart, marchEnd)
    // RFC 5545: Feb has no day 31 → skip; next occurrence is Mar 31
    expect(result.length).toBe(1)
    expect(result[0].startDate?.getDate()).toBe(31)
  })

  it('supports multi-day recurrence — every Monday and Thursday', () => {
    const item = makeItem({
      recurrence: 'FREQ=WEEKLY;BYDAY=MO,TH',
      startDate: new Date(2026, 1, 16), // Mon Feb 16
    })
    const result = expandRecurringItem(item, windowStart, windowEnd)
    // Feb 16–22: Mon Feb 16, Thu Feb 19
    expect(result.length).toBe(2)
    const dates = result.map((r) => r.startDate?.getDate()).sort()
    expect(dates).toEqual([16, 19])
  })
})
