import type { IncomeType } from './Income'

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly'

export type RecurringTransaction = {
  id: string
  familyId: string
  direction: 'expense' | 'income'
  description: string
  amount: number
  frequency: RecurringFrequency
  /** YYYY-MM-DD — use parseLocalDate() when converting to Date */
  startDate: string
  /** YYYY-MM-DD — the next date an entry will be generated */
  nextDueDate: string
  /** YYYY-MM-DD — null means runs forever */
  endDate: string | null
  // expense-only
  categoryId: string | null
  locationId: string | null
  paidById: string | null
  // income-only
  personId: string | null
  incomeType: IncomeType | null
  createdAt: Date
}
