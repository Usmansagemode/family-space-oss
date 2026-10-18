import type { Space, SpaceType } from '@family/types'
import { getSupabaseClient } from './client'

function rowToSpace(row: {
  id: string
  family_id: string
  name: string
  color: string
  type: string
  sort_order: number
  show_in_expenses: boolean
  assigned_person_id: string | null
  is_system: boolean
  linked_user_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}): Space {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    color: row.color,
    type: row.type as SpaceType,
    sortOrder: row.sort_order,
    showInExpenses: row.show_in_expenses,
    assignedPersonId: row.assigned_person_id ?? null,
    isSystem: row.is_system,
    linkedUserId: row.linked_user_id ?? null,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function fetchSpaces(familyId: string): Promise<Space[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('family_id', familyId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data.map(rowToSpace)
}

/** Spaces visible in expense pickers — active + show_in_expenses = true */
export async function fetchExpensePickerSpaces(
  familyId: string,
  type: SpaceType,
): Promise<Space[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('family_id', familyId)
    .eq('type', type)
    .eq('show_in_expenses', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data.map(rowToSpace)
}

export async function createSpace(input: {
  familyId: string
  name: string
  color: string
  type: SpaceType
  showInExpenses?: boolean
}): Promise<Space> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('spaces')
    .insert({
      family_id: input.familyId,
      name: input.name,
      color: input.color,
      type: input.type,
      show_in_expenses: input.showInExpenses ?? true,
    })
    .select()
    .single()

  if (error) throw error
  return rowToSpace(data)
}

export async function updateSpace(
  id: string,
  input: Partial<{
    name: string
    color: string
    showInExpenses: boolean
    assignedPersonId: string | null
  }>,
): Promise<Space> {
  const update: Record<string, unknown> = {}
  if (input.name !== undefined) update.name = input.name
  if (input.color !== undefined) update.color = input.color
  if (input.showInExpenses !== undefined) update.show_in_expenses = input.showInExpenses
  if ('assignedPersonId' in input) update.assigned_person_id = input.assignedPersonId ?? null

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('spaces')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToSpace(data)
}

/** Soft delete — sets deleted_at. Use this instead of hard delete when expenses reference this space. */
export async function archiveSpace(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('spaces')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Restore a soft-deleted space by clearing deleted_at. */
export async function restoreSpace(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('spaces')
    .update({ deleted_at: null })
    .eq('id', id)
  if (error) throw error
}

/** Fetch soft-deleted person spaces for a family (for the archived members list). */
export async function fetchArchivedPersonSpaces(familyId: string): Promise<Space[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('family_id', familyId)
    .eq('type', 'person')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) throw error
  return data.map(rowToSpace)
}

/** Hard delete — only safe when no expenses reference this space. */
export async function deleteSpace(id: string, familyId?: string): Promise<void> {
  const supabase = getSupabaseClient()
  let query = supabase.from('spaces').delete().eq('id', id)
  if (familyId) query = query.eq('family_id', familyId)
  const { error } = await query
  if (error) throw error
}

/** Count expenses referencing this space (for deletion dialog). */
export async function countSpaceExpenses(spaceId: string): Promise<number> {
  const supabase = getSupabaseClient()
  const { count: loc, error: e1 } = await supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('location_id', spaceId)
  const { count: paid, error: e2 } = await supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('paid_by_id', spaceId)
  if (e1) throw e1
  if (e2) throw e2
  return (loc ?? 0) + (paid ?? 0)
}

export async function reorderSpaces(orderedIds: string[]): Promise<void> {
  const supabase = getSupabaseClient()
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('spaces').update({ sort_order: index }).eq('id', id),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}
