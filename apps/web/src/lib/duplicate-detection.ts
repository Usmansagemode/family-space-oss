export type DuplicateReason = 'amount+category' | 'amount+date'

export type DuplicateMatch = {
  id: string
  reason: DuplicateReason
}

/**
 * Detects potential duplicate expenses.
 *
 * Flags a pair when amounts match (to the cent) AND at least one of:
 *   - same non-null categoryId, OR both categoryId are null
 *   - same date (strong signal, used in import context)
 *
 * Returns a Map<id, DuplicateMatch[]> — only IDs with at least one match are included.
 */
export function detectDuplicates<T extends {
  id: string
  amount: number
  categoryId: string | null
  date: string
}>(items: T[]): Map<string, DuplicateMatch[]> {
  const result = new Map<string, DuplicateMatch[]>()

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!
      const b = items[j]!

      if (Math.round(a.amount * 100) !== Math.round(b.amount * 100)) continue

      const sameDate = a.date === b.date
      const sameCategory = a.categoryId !== null
        ? a.categoryId === b.categoryId
        : b.categoryId === null // both null

      if (!sameDate && !sameCategory) continue

      // Prefer 'amount+date' when both apply — it's the stronger signal
      const reason: DuplicateReason = sameDate ? 'amount+date' : 'amount+category'

      if (!result.has(a.id)) result.set(a.id, [])
      result.get(a.id)!.push({ id: b.id, reason })

      if (!result.has(b.id)) result.set(b.id, [])
      result.get(b.id)!.push({ id: a.id, reason })
    }
  }

  return result
}
