export type SplitType = 'equal' | 'shares' | 'percentage'

export type SplitGroup = {
  id: string
  familyId: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export type SplitParticipant = {
  id: string
  groupId: string
  name: string
  createdAt: Date
}

export type SplitExpense = {
  id: string
  groupId: string
  familyId: string
  paidByParticipantId: string
  amount: number
  description?: string
  date: string
  splitType: SplitType
  createdAt: Date
  updatedAt: Date
}

export type SplitShare = {
  id: string
  expenseId: string
  participantId: string
  amount: number
  createdAt: Date
}

export type SplitSettlement = {
  id: string
  groupId: string
  familyId: string
  fromParticipantId: string
  toParticipantId: string
  amount: number
  note?: string
  date: string
  createdAt: Date
}

export type SplitExpenseWithShares = SplitExpense & {
  shares: SplitShare[]
}
