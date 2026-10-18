export type BudgetPeriod = 'monthly' | 'yearly'

export type Budget = {
  id: string
  familyId: string
  /** null = family-wide budget (not per-person) */
  personId: string | null
  /** null = overall budget (not per-category) */
  categoryId: string | null
  amount: number
  period: BudgetPeriod
  createdAt: Date
  updatedAt: Date
}
