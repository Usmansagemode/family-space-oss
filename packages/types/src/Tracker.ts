export type Tracker = {
  id: string
  familyId: string
  title: string
  description?: string
  initialBalance: number
  currentBalance: number
  color?: string
  createdAt: Date
  updatedAt: Date
}

export type TrackerEntry = {
  id: string
  trackerId: string
  familyId: string
  /** YYYY-MM-DD */
  date: string
  description?: string
  debit: number
  credit: number
  balance: number
  createdAt: Date
}
