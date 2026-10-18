import type { Family, FamilyMember } from '@family/types'
import { getSupabaseClient } from './client'

export type { Family, FamilyMember }

function mapFamily(data: {
  id: string
  name: string
  plan?: string | null
  currency?: string | null
  locale?: string | null
  google_calendar_id: string | null
  google_calendar_embed_url?: string | null
  suspended_at?: string | null
  suspend_reason?: string | null
  onboarding_completed_at?: string | null
  created_at: string
  updated_at?: string | null
}): Family {
  return {
    id: data.id,
    name: data.name,
    plan: (data.plan ?? 'free') as Family['plan'],
    currency: data.currency ?? 'USD',
    locale: data.locale ?? 'en-US',
    googleCalendarId: data.google_calendar_id ?? undefined,
    googleCalendarEmbedUrl: data.google_calendar_embed_url ?? undefined,
    suspendedAt: data.suspended_at ? new Date(data.suspended_at) : null,
    suspendReason: data.suspend_reason ?? null,
    onboardingCompletedAt: data.onboarding_completed_at
      ? new Date(data.onboarding_completed_at)
      : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at ?? data.created_at),
  }
}

export async function fetchFamily(id: string): Promise<Family> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return mapFamily(data)
}

export async function updateFamily(
  id: string,
  input: {
    name?: string
    currency?: string
    locale?: string
    googleCalendarId?: string
    googleCalendarEmbedUrl?: string
    onboardingCompletedAt?: Date | string | null
  },
): Promise<Family> {
  const supabase = getSupabaseClient()
  const dbInput: Record<string, unknown> = {}
  if (input.name !== undefined) dbInput['name'] = input.name
  if (input.currency !== undefined) dbInput['currency'] = input.currency
  if (input.locale !== undefined) dbInput['locale'] = input.locale
  if (input.googleCalendarId !== undefined)
    dbInput['google_calendar_id'] = input.googleCalendarId || null
  if (input.googleCalendarEmbedUrl !== undefined)
    dbInput['google_calendar_embed_url'] = input.googleCalendarEmbedUrl || null
  if (input.onboardingCompletedAt !== undefined) {
    dbInput['onboarding_completed_at'] =
      input.onboardingCompletedAt instanceof Date
        ? input.onboardingCompletedAt.toISOString()
        : input.onboardingCompletedAt
  }

  const { data, error } = await supabase
    .from('families')
    .update(dbInput)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapFamily(data)
}

export async function findFamily(userId: string): Promise<Family | null> {
  const supabase = getSupabaseClient()
  const { data: membership } = await supabase
    .from('user_families')
    .select('family_id, families(*)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (!membership?.families) return null
  return mapFamily(membership.families as unknown as Parameters<typeof mapFamily>[0])
}

export async function fetchFamilyMembers(
  familyId: string,
): Promise<FamilyMember[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('user_families')
    .select('user_id, role, joined_at, profiles(name, email, avatar_url)')
    .eq('family_id', familyId)

  if (error) throw error

  return data.map((row) => {
    const profile = row.profiles as unknown as {
      name: string | null
      email: string | null
      avatar_url: string | null
    } | null
    return {
      userId: row.user_id as string,
      familyId,
      role: row.role as 'owner' | 'member',
      joinedAt: new Date(row.joined_at as string),
      name: profile?.name ?? null,
      email: profile?.email ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    }
  })
}

export async function removeFamilyMember(
  familyId: string,
  userId: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error, count } = await supabase
    .from('user_families')
    .delete({ count: 'exact' })
    .eq('family_id', familyId)
    .eq('user_id', userId)

  if (error) throw error
  if (count === 0)
    throw new Error('Delete blocked — check RLS policy on user_families')

  // Unlink the system person space so it becomes a virtual member.
  // This keeps it visible as a "Paid by" option for historical expenses
  // while making it manageable from the virtual members section.
  await supabase
    .from('spaces')
    .update({ linked_user_id: null })
    .eq('family_id', familyId)
    .eq('linked_user_id', userId)
    .eq('type', 'person')
    .eq('is_system', true)
    .is('deleted_at', null)
}

export async function findOrCreateFamily(userId: string): Promise<Family> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('find_or_create_family', {
    p_user_id: userId,
  })

  if (error) throw error
  return mapFamily(data as Parameters<typeof mapFamily>[0])
}
