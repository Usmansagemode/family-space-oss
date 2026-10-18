export type ActivityEventType =
  | 'item.added'
  | 'item.completed'
  | 'expense.added'
  | 'expenses.imported'
  | 'member.joined'

export type ActivityEvent = {
  id: string
  eventType: ActivityEventType
  payload: Record<string, unknown>
  actorId: string | null
  actorName: string | null
  timestamp: Date
}
