import type { RecurringTransaction } from '@family/types'
import { getSupabaseClient } from './client'

function rowToRecurring(row: {
  id: string
  family_id: string
  direction: string
  description: string
  amount: number
  frequency: string
  start_date: string
  next_due_date: string
  end_date: string | null
  category_id: string | null
  location_id: string | null
  paid_by_id: string | null
  person_id: string | null
  income_type: string | null
  created_at: string
}): RecurringTransaction {
  return {
    id: row.id,
    familyId: row.family_id,
    direction: row.direction as 'expense' | 'income',
    description: row.description,
    amount: row.amount,
    frequency: row.frequency as RecurringTransaction['frequency'],
    startDate: row.start_date,
    nextDueDate: row.next_due_date,
    endDate: row.end_date,
    categoryId: row.category_id,
    locationId: row.location_id,
    paidById: row.paid_by_id,
    personId: row.person_id,
    incomeType: row.income_type as RecurringTransaction['incomeType'],
    createdAt: new Date(row.created_at),
  }
}

export async function fetchRecurringTransactions(
  familyId: string,
): Promise<RecurringTransaction[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(rowToRecurring)
}

export async function createRecurringTransaction(input: {
  familyId: string
  direction: 'expense' | 'income'
  description: string
  amount: number
  frequency: RecurringTransaction['frequency']
  startDate: string
  nextDueDate: string
  endDate?: string | null
  categoryId?: string | null
  locationId?: string | null
  paidById?: string | null
  personId?: string | null
  incomeType?: RecurringTransaction['incomeType']
}): Promise<RecurringTransaction> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({
      family_id: input.familyId,
      direction: input.direction,
      description: input.description,
      amount: input.amount,
      frequency: input.frequency,
      start_date: input.startDate,
      next_due_date: input.nextDueDate,
      end_date: input.endDate ?? null,
      category_id: input.categoryId ?? null,
      location_id: input.locationId ?? null,
      paid_by_id: input.paidById ?? null,
      person_id: input.personId ?? null,
      income_type: input.incomeType ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return rowToRecurring(data)
}

export async function updateRecurringTransaction(
  id: string,
  input: Partial<{
    description: string
    amount: number
    frequency: RecurringTransaction['frequency']
    nextDueDate: string
    endDate: string | null
    categoryId: string | null
    locationId: string | null
    paidById: string | null
    personId: string | null
    incomeType: RecurringTransaction['incomeType']
  }>,
): Promise<RecurringTransaction> {
  const update: Record<string, unknown> = {}
  if (input.description !== undefined) update.description = input.description
  if (input.amount !== undefined) update.amount = input.amount
  if (input.frequency !== undefined) update.frequency = input.frequency
  if (input.nextDueDate !== undefined) update.next_due_date = input.nextDueDate
  if ('endDate' in input) update.end_date = input.endDate
  if ('categoryId' in input) update.category_id = input.categoryId
  if ('locationId' in input) update.location_id = input.locationId
  if ('paidById' in input) update.paid_by_id = input.paidById
  if ('personId' in input) update.person_id = input.personId
  if ('incomeType' in input) update.income_type = input.incomeType

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('recurring_transactions')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToRecurring(data)
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('recurring_transactions')
    .delete()
    .eq('id', id)
  if (error) throw error
}
