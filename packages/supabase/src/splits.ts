import type {
  SplitGroup,
  SplitParticipant,
  SplitExpense,
  SplitShare,
  SplitSettlement,
  SplitExpenseWithShares,
  SplitType,
} from '@family/types'
import { getSupabaseClient } from './client'

function rowToGroup(row: {
  id: string
  family_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}): SplitGroup {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function rowToParticipant(row: {
  id: string
  group_id: string
  name: string
  created_at: string
}): SplitParticipant {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    createdAt: new Date(row.created_at),
  }
}

function rowToShare(row: {
  id: string
  expense_id: string
  participant_id: string
  amount: number
  created_at: string
}): SplitShare {
  return {
    id: row.id,
    expenseId: row.expense_id,
    participantId: row.participant_id,
    amount: row.amount,
    createdAt: new Date(row.created_at),
  }
}

function rowToExpense(row: {
  id: string
  group_id: string
  family_id: string
  paid_by_participant_id: string
  amount: number
  description: string | null
  date: string
  split_type: string
  created_at: string
  updated_at: string
}): SplitExpense {
  return {
    id: row.id,
    groupId: row.group_id,
    familyId: row.family_id,
    paidByParticipantId: row.paid_by_participant_id,
    amount: row.amount,
    description: row.description ?? undefined,
    date: row.date,
    splitType: row.split_type as SplitType,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function rowToSettlement(row: {
  id: string
  group_id: string
  family_id: string
  from_participant_id: string
  to_participant_id: string
  amount: number
  note: string | null
  date: string
  created_at: string
}): SplitSettlement {
  return {
    id: row.id,
    groupId: row.group_id,
    familyId: row.family_id,
    fromParticipantId: row.from_participant_id,
    toParticipantId: row.to_participant_id,
    amount: row.amount,
    note: row.note ?? undefined,
    date: row.date,
    createdAt: new Date(row.created_at),
  }
}

// ---- Groups ----

export async function fetchSplitGroups(familyId: string): Promise<SplitGroup[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('split_groups')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(rowToGroup)
}

export async function fetchSplitGroup(id: string): Promise<SplitGroup> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('split_groups')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return rowToGroup(data)
}

export async function createSplitGroup(input: {
  familyId: string
  name: string
  description?: string
}): Promise<SplitGroup> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('split_groups')
    .insert({
      family_id: input.familyId,
      name: input.name,
      description: input.description ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return rowToGroup(data)
}

export async function updateSplitGroup(
  id: string,
  input: { name?: string; description?: string },
): Promise<SplitGroup> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('split_groups')
    .update({ name: input.name, description: input.description ?? null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return rowToGroup(data)
}

export async function deleteSplitGroup(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('split_groups').delete().eq('id', id)
  if (error) throw error
}

// ---- Participants ----

export async function fetchSplitParticipants(groupId: string): Promise<SplitParticipant[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('split_participants')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(rowToParticipant)
}

export async function createSplitParticipant(input: {
  groupId: string
  name: string
}): Promise<SplitParticipant> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('split_participants')
    .insert({ group_id: input.groupId, name: input.name })
    .select()
    .single()
  if (error) throw error
  return rowToParticipant(data)
}

export async function deleteSplitParticipant(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('split_participants').delete().eq('id', id)
  if (error) throw error
}

// ---- Expenses ----

export async function fetchSplitExpenses(groupId: string): Promise<SplitExpenseWithShares[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('split_expenses')
    .select('*, split_shares(*)')
    .eq('group_id', groupId)
    .order('date', { ascending: false })
  if (error) throw error
  return data.map((row) => ({
    ...rowToExpense(row),
    shares: (row.split_shares as Array<{
      id: string
      expense_id: string
      participant_id: string
      amount: number
      created_at: string
    }>).map(rowToShare),
  }))
}

export async function createSplitExpense(input: {
  groupId: string
  familyId: string
  paidByParticipantId: string
  amount: number
  description?: string
  date: string
  splitType: SplitType
  shares: Array<{ participantId: string; amount: number }>
}): Promise<SplitExpenseWithShares> {
  const supabase = getSupabaseClient()

  const { data: expense, error: eErr } = await supabase
    .from('split_expenses')
    .insert({
      group_id: input.groupId,
      family_id: input.familyId,
      paid_by_participant_id: input.paidByParticipantId,
      amount: input.amount,
      description: input.description ?? null,
      date: input.date,
      split_type: input.splitType,
    })
    .select()
    .single()
  if (eErr) throw eErr

  const { data: shares, error: sErr } = await supabase
    .from('split_shares')
    .insert(
      input.shares.map((s) => ({
        expense_id: expense.id,
        participant_id: s.participantId,
        amount: s.amount,
      })),
    )
    .select()
  if (sErr) throw sErr

  return {
    ...rowToExpense(expense),
    shares: shares.map(rowToShare),
  }
}

export async function updateSplitExpense(
  id: string,
  input: {
    paidByParticipantId?: string
    amount?: number
    description?: string
    date?: string
    splitType?: SplitType
    shares?: Array<{ participantId: string; amount: number }>
  },
): Promise<SplitExpenseWithShares> {
  const supabase = getSupabaseClient()

  const dbInput: Record<string, unknown> = {}
  if (input.paidByParticipantId) dbInput['paid_by_participant_id'] = input.paidByParticipantId
  if (input.amount !== undefined) dbInput['amount'] = input.amount
  if (input.description !== undefined) dbInput['description'] = input.description ?? null
  if (input.date) dbInput['date'] = input.date
  if (input.splitType) dbInput['split_type'] = input.splitType

  const { data: expense, error: eErr } = await supabase
    .from('split_expenses')
    .update(dbInput)
    .eq('id', id)
    .select()
    .single()
  if (eErr) throw eErr

  if (input.shares) {
    const { error: dErr } = await supabase.from('split_shares').delete().eq('expense_id', id)
    if (dErr) throw dErr

    const { data: shares, error: sErr } = await supabase
      .from('split_shares')
      .insert(input.shares.map((s) => ({ expense_id: id, participant_id: s.participantId, amount: s.amount })))
      .select()
    if (sErr) throw sErr

    return { ...rowToExpense(expense), shares: shares.map(rowToShare) }
  }

  const { data: shares, error: sErr } = await supabase
    .from('split_shares')
    .select('*')
    .eq('expense_id', id)
  if (sErr) throw sErr

  return { ...rowToExpense(expense), shares: shares.map(rowToShare) }
}

export async function deleteSplitExpense(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('split_expenses').delete().eq('id', id)
  if (error) throw error
}

// ---- Settlements ----

export async function fetchSplitSettlements(groupId: string): Promise<SplitSettlement[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('split_settlements')
    .select('*')
    .eq('group_id', groupId)
    .order('date', { ascending: false })
  if (error) throw error
  return data.map(rowToSettlement)
}

export async function createSplitSettlement(input: {
  groupId: string
  familyId: string
  fromParticipantId: string
  toParticipantId: string
  amount: number
  note?: string
  date: string
}): Promise<SplitSettlement> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('split_settlements')
    .insert({
      group_id: input.groupId,
      family_id: input.familyId,
      from_participant_id: input.fromParticipantId,
      to_participant_id: input.toParticipantId,
      amount: input.amount,
      note: input.note ?? null,
      date: input.date,
    })
    .select()
    .single()
  if (error) throw error
  return rowToSettlement(data)
}

export async function deleteSplitSettlement(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('split_settlements').delete().eq('id', id)
  if (error) throw error
}
