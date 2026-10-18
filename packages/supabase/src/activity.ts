import type { ActivityEventType } from '@family/types'
import { getSupabaseClient } from './client'

export type RawActivityLog = {
  id: string
  eventType: ActivityEventType
  payload: Record<string, unknown>
  actorId: string | null
  createdAt: Date
}

export async function logActivity(
  familyId: string,
  eventType: ActivityEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('activity_log')
    .insert({ family_id: familyId, event_type: eventType, payload })

  // Log silently — never block the primary action
  if (error) console.error('[activity] failed to log', eventType, error)
}

export async function fetchActivityLog(
  familyId: string,
): Promise<RawActivityLog[]> {
  const supabase = getSupabaseClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)

  const { data, error } = await supabase
    .from('activity_log')
    .select('id, event_type, payload, actor_id, created_at')
    .eq('family_id', familyId)
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    eventType: row.event_type as ActivityEventType,
    payload: row.payload as Record<string, unknown>,
    actorId: row.actor_id as string | null,
    createdAt: new Date(row.created_at),
  }))
}
