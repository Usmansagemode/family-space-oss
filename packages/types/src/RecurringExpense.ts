export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly'

export type RecurringExpense = {
  id: string
  familyId: string
  description: string
  amount: number
  categoryId: string | null
  locationId: string | null
  paidById: string | null
  frequency: RecurringFrequency
  /** YYYY-MM-DD — use parseLocalDate() when converting to Date */
  startDate: string
  /** YYYY-MM-DD — the next date an expense will be generated */
  nextDueDate: string
  /** YYYY-MM-DD — null means runs forever */
  endDate: string | null
  createdAt: Date
}
