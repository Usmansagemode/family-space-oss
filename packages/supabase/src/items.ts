import type { Item, Recurrence } from '@family/types'
import { getSupabaseClient } from './client'

// Noon (12:00 local) is the sentinel used by AddItemSheet for "date picked, no
// explicit time". Any other hour/minute means the user deliberately set a time.
function hasExplicitTime(date: Date): boolean {
  return !(date.getHours() === 12 && date.getMinutes() === 0)
}

// Store as "YYYY-MM-DD" for date-only items (Postgres interprets as UTC midnight,
// parseDateOnly recovers the local day without timezone shift).
function toDateOnly(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Store date-only items as "YYYY-MM-DD"; timed items as full UTC ISO so the
// time round-trips correctly through Supabase's UTC TIMESTAMPTZ column.
function toItemDate(date: Date): string {
  return hasExplicitTime(date) ? date.toISOString() : toDateOnly(date)
}

// Parse a date-only string back to local noon — the "no explicit time" sentinel.
// Returning midnight would make hasExplicitTime() treat the parsed value as timed,
// breaking the round-trip (EditSheet would show "00:00" and re-save as ISO).
function parseDateOnly(isoStr: string): Date {
  const [y, m, d] = isoStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

// Smart parser: midnight UTC → local date (avoids day shift); any other UTC
// time → parse as UTC so the local time is correctly reconstructed.
function parseItemDate(isoStr: string): Date {
  const match = isoStr.match(/T(\d{2}):(\d{2}):(\d{2})/)
  if (!match || (match[1] === '00' && match[2] === '00' && match[3] === '00')) {
    return parseDateOnly(isoStr)
  }
  return new Date(isoStr)
}

function rowToItem(row: {
  id: string
  family_id?: string | null
  space_id: string
  title: string
  description: string | null
  quantity: string | null
  start_date: string | null
  end_date: string | null
  recurrence: string | null
  completed: boolean
  completed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
}): Item {
  return {
    id: row.id,
    familyId: row.family_id ?? undefined,
    spaceId: row.space_id,
    title: row.title,
    description: row.description ?? undefined,
    quantity: row.quantity ?? undefined,
    startDate: row.start_date ? parseItemDate(row.start_date) : undefined,
    endDate: row.end_date ? parseItemDate(row.end_date) : undefined,
    recurrence: row.recurrence as Recurrence | undefined,
    completed: row.completed,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function fetchItems(spaceId: string): Promise<Item[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('space_id', spaceId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(rowToItem)
}

export async function createItem(input: {
  familyId: string
  spaceId: string
  title: string
  description?: string
  quantity?: string
  startDate?: Date
  endDate?: Date
  recurrence?: Recurrence
}): Promise<Item> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('items')
    .insert({
      family_id: input.familyId,
      space_id: input.spaceId,
      title: input.title,
      description: input.description ?? null,
      quantity: input.quantity ?? null,
      start_date: input.startDate ? toItemDate(input.startDate) : null,
      end_date: input.endDate ? toItemDate(input.endDate) : null,
      recurrence: input.recurrence ?? null,
      sort_order: 0,
    })
    .select()
    .single()

  if (error) throw error
  return rowToItem(data)
}

export async function updateItem(
  id: string,
  input: Partial<{
    title: string
    description: string
    quantity: string | null
    startDate: Date
    endDate: Date
    recurrence: Recurrence | null
  }>,
): Promise<Item> {
  const supabase = getSupabaseClient()
  const dbInput: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.title !== undefined) dbInput['title'] = input.title
  if (input.description !== undefined)
    dbInput['description'] = input.description
  if (input.quantity !== undefined) dbInput['quantity'] = input.quantity
  if (input.startDate !== undefined)
    dbInput['start_date'] = toItemDate(input.startDate)
  if (input.endDate !== undefined)
    dbInput['end_date'] = toItemDate(input.endDate)
  if (input.recurrence !== undefined) dbInput['recurrence'] = input.recurrence

  const { data, error } = await supabase
    .from('items')
    .update(dbInput)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToItem(data)
}

export async function completeItem(id: string): Promise<Item> {
  const supabase = getSupabaseClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('items')
    .update({ completed: true, completed_at: now, updated_at: now })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToItem(data)
}

export async function deleteItem(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}

export async function moveItem(id: string, newSpaceId: string): Promise<Item> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('items')
    .update({ space_id: newSpaceId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToItem(data)
}

export async function searchItems(
  spaceIds: string[],
  query: string,
): Promise<Item[]> {
  if (spaceIds.length === 0) return []

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .in('space_id', spaceIds)
    .eq('completed', false)
    .ilike('title', `%${query}%`)
    .order('title')
    .limit(20)

  if (error) throw error
  return data.map(rowToItem)
}

export async function reorderItems(
  _spaceId: string,
  orderedIds: string[],
): Promise<void> {
  const supabase = getSupabaseClient()
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('items').update({ sort_order: index }).eq('id', id),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}

// Advance a recurring item to its next occurrence without marking it complete.
export async function advanceRecurringItem(
  id: string,
  nextStartDate: Date,
  nextEndDate?: Date,
): Promise<Item> {
  const supabase = getSupabaseClient()
  const dbInput: Record<string, unknown> = {
    start_date: toItemDate(nextStartDate),
    end_date: nextEndDate ? toItemDate(nextEndDate) : null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('items')
    .update(dbInput)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToItem(data)
}

// Query 1: non-recurring items within the calendar window.
// Boundaries use ±1 local day so timed items stored as UTC don't fall outside
// the window due to UTC/local offset on the first or last day of the range.
// Extra items fetched outside the visible window are harmless — schedule-x
// only renders events that fall on a date in its current view.
export async function fetchNonRecurringCalendarItems(
  familyId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<Item[]> {
  const supabase = getSupabaseClient()
  const startBuffer = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate() - 1)
  const endBuffer = new Date(windowEnd.getFullYear(), windowEnd.getMonth(), windowEnd.getDate() + 1)
  const startStr = toDateOnly(startBuffer)
  const endStr = toDateOnly(endBuffer)

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('family_id', familyId)
    .is('recurrence', null)
    .gte('start_date', startStr)
    .lte('start_date', endStr)
    .eq('completed', false)

  if (error) throw error
  return data.map(rowToItem)
}

// Upcoming timeline — fallback: next single non-recurring item after afterISO.
// Only called when the 7-day window returns empty.
export async function fetchNextItemAfter(
  familyId: string,
  afterISO: string,
): Promise<Item[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('family_id', familyId)
    .eq('completed', false)
    .is('recurrence', null)
    .gt('start_date', afterISO)
    .order('start_date', { ascending: true })
    .limit(1)

  if (error) throw error
  return data.map(rowToItem)
}

// Query 2: all active recurring items whose current start_date falls at or before
// the window end. No lower bound — expandRecurringItem projects occurrences
// client-side. Historical navigation shows nothing for items already advanced
// past the window (their past occurrences were completed and filtered out).
export async function fetchRecurringCalendarItems(
  familyId: string,
  windowEnd: Date,
): Promise<Item[]> {
  const supabase = getSupabaseClient()
  const endBuffer = new Date(windowEnd.getFullYear(), windowEnd.getMonth(), windowEnd.getDate() + 1)
  const endStr = toDateOnly(endBuffer)

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('family_id', familyId)
    .not('recurrence', 'is', null)
    .lte('start_date', endStr)
    .eq('completed', false)

  if (error) throw error
  return data.map(rowToItem)
}

// Uncomplete an existing item rather than creating a new row.
export async function reAddItem(original: Item): Promise<Item> {
  const supabase = getSupabaseClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('items')
    .update({ completed: false, completed_at: null, updated_at: now })
    .eq('id', original.id)
    .select()
    .single()

  if (error) throw error
  return rowToItem(data)
}
