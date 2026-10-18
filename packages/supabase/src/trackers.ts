import type { Tracker, TrackerEntry } from '@family/types'
import { getSupabaseClient } from './client'

function rowToTracker(row: {
  id: string
  family_id: string
  title: string
  description: string | null
  initial_balance: number
  current_balance: number
  color: string | null
  created_at: string
  updated_at: string
}): Tracker {
  return {
    id: row.id,
    familyId: row.family_id,
    title: row.title,
    description: row.description ?? undefined,
    initialBalance: row.initial_balance,
    currentBalance: row.current_balance,
    color: row.color ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function rowToEntry(row: {
  id: string
  tracker_id: string
  family_id: string
  date: string
  description: string | null
  debit: number
  credit: number
  balance: number
  created_at: string
}): TrackerEntry {
  return {
    id: row.id,
    trackerId: row.tracker_id,
    familyId: row.family_id,
    date: row.date,
    description: row.description ?? undefined,
    debit: row.debit,
    credit: row.credit,
    balance: row.balance,
    createdAt: new Date(row.created_at),
  }
}

export async function fetchTrackers(familyId: string): Promise<Tracker[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('trackers')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data.map(rowToTracker)
}

export async function createTracker(input: {
  familyId: string
  title: string
  description?: string
  initialBalance: number
  color?: string
}): Promise<Tracker> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('trackers')
    .insert({
      family_id: input.familyId,
      title: input.title,
      description: input.description ?? null,
      initial_balance: input.initialBalance,
      current_balance: input.initialBalance,
      color: input.color ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return rowToTracker(data)
}

export async function updateTracker(
  id: string,
  input: Partial<{ title: string; description: string; color: string }>,
): Promise<Tracker> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('trackers')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToTracker(data)
}

export async function deleteTracker(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('trackers').delete().eq('id', id)
  if (error) throw error
}

export async function fetchTrackerEntries(trackerId: string): Promise<TrackerEntry[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('tracker_entries')
    .select('*')
    .eq('tracker_id', trackerId)
    .order('date', { ascending: false })

  if (error) throw error
  return data.map(rowToEntry)
}

export async function addTrackerEntry(input: {
  trackerId: string
  familyId: string
  date: string
  debit: number
  credit: number
  description?: string
}): Promise<{ entry: TrackerEntry; tracker: Tracker }> {
  const supabase = getSupabaseClient()

  // Fetch current balance
  const { data: tracker, error: tErr } = await supabase
    .from('trackers')
    .select('current_balance')
    .eq('id', input.trackerId)
    .single()
  if (tErr) throw tErr

  const newBalance = tracker.current_balance + input.debit - input.credit

  // Insert entry
  const { data: entry, error: eErr } = await supabase
    .from('tracker_entries')
    .insert({
      tracker_id: input.trackerId,
      family_id: input.familyId,
      date: input.date,
      debit: input.debit,
      credit: input.credit,
      balance: newBalance,
      description: input.description ?? null,
    })
    .select()
    .single()
  if (eErr) throw eErr

  // Update tracker current_balance
  const { data: updated, error: uErr } = await supabase
    .from('trackers')
    .update({ current_balance: newBalance })
    .eq('id', input.trackerId)
    .select()
    .single()
  if (uErr) throw uErr

  return { entry: rowToEntry(entry), tracker: rowToTracker(updated) }
}

export async function deleteTrackerEntry(
  entryId: string,
  trackerId: string,
  entryDebit: number,
  entryCredit: number,
): Promise<Tracker> {
  const supabase = getSupabaseClient()

  const { data: tracker, error: tErr } = await supabase
    .from('trackers')
    .select('current_balance')
    .eq('id', trackerId)
    .single()
  if (tErr) throw tErr

  // Reverse the entry's effect
  const restoredBalance = tracker.current_balance - entryDebit + entryCredit

  const { error: dErr } = await supabase.from('tracker_entries').delete().eq('id', entryId)
  if (dErr) throw dErr

  const { data: updated, error: uErr } = await supabase
    .from('trackers')
    .update({ current_balance: restoredBalance })
    .eq('id', trackerId)
    .select()
    .single()
  if (uErr) throw uErr

  return rowToTracker(updated)
}
