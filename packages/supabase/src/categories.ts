import type { Category } from '@family/types'
import { getSupabaseClient } from './client'

function rowToCategory(row: {
  id: string
  family_id: string
  name: string
  color: string | null
  icon: string | null
  sort_order: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}): Category {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/** Active (non-archived) categories for a family — used in pickers and charts */
export async function fetchCategories(familyId: string): Promise<Category[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('family_id', familyId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data.map(rowToCategory)
}

/** All categories including archived — for rendering historical expense names */
export async function fetchAllCategories(familyId: string): Promise<Category[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('family_id', familyId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data.map(rowToCategory)
}

export async function createCategory(input: {
  familyId: string
  name: string
  color?: string
  icon?: string
}): Promise<Category> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('categories')
    .insert({
      family_id: input.familyId,
      name: input.name,
      color: input.color ?? null,
      icon: input.icon ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return rowToCategory(data)
}

export async function updateCategory(
  id: string,
  input: Partial<{ name: string; color: string; icon: string; sortOrder: number }>,
): Promise<Category> {
  const update: Record<string, unknown> = {}
  if (input.name !== undefined) update.name = input.name
  if (input.color !== undefined) update.color = input.color
  if (input.icon !== undefined) update.icon = input.icon
  if (input.sortOrder !== undefined) update.sort_order = input.sortOrder

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('categories')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToCategory(data)
}

/** Count expenses referencing this category (for deletion dialog). */
export async function countCategoryExpenses(categoryId: string): Promise<number> {
  const supabase = getSupabaseClient()
  const { count, error } = await supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)
  if (error) throw error
  return count ?? 0
}

/** Soft delete — hides from pickers but preserves expense history. */
export async function archiveCategory(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** Restore a soft-deleted category back to active. */
export async function unarchiveCategory(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('categories')
    .update({ deleted_at: null })
    .eq('id', id)
  if (error) throw error
}

/** Hard delete — only safe when countCategoryExpenses returns 0. */
export async function deleteCategory(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

/** Reassign all expenses from one category to another, then hard-delete the old one.
 *  Runs in a single DB transaction via RPC to prevent partial failures. */
export async function reassignAndDeleteCategory(
  oldId: string,
  newId: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('reassign_and_delete_category', {
    p_old_id: oldId,
    p_new_id: newId,
  })
  if (error) throw error
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const supabase = getSupabaseClient()
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('categories').update({ sort_order: index }).eq('id', id),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}
