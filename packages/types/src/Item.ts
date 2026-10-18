// RRULE string e.g. 'FREQ=WEEKLY', 'FREQ=WEEKLY;BYDAY=MO,TH'
export type Recurrence = string

export type Item = {
  id: string
  familyId?: string
  spaceId: string
  title: string
  description?: string
  quantity?: string
  recurrence?: Recurrence
  sortOrder: number
  startDate?: Date
  endDate?: Date
  completed: boolean
  completedAt?: Date
  completedBy?: string
  createdBy?: string
  googleEventId?: string
  createdAt: Date
  updatedAt: Date
}

export type CalendarItem = Omit<Item, 'familyId'> & {
  familyId: string
  isVirtual: boolean
}
