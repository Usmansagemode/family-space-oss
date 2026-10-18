import { getSupabaseClient } from './client'
import { logActivity } from './activity'

export type InviteInfo = {
  familyId: string
  familyName: string
}

export async function createInvite(familyId: string): Promise<string> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('invites')
    .insert({ family_id: familyId })
    .select('token')
    .single()

  if (error) throw error
  return data.token as string
}

export async function getInviteByToken(
  token: string,
): Promise<InviteInfo | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('invites')
    .select('family_id, accepted_at, families(name)')
    .eq('token', token)
    .maybeSingle()

  if (error || !data) return null
  if (data.accepted_at) return null // already accepted

  return {
    familyId: data.family_id as string,
    familyName: (data.families as unknown as { name: string } | null)?.name ?? 'Family',
  }
}

export async function acceptInvite(
  token: string,
  userId: string,
  familyId: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.rpc('accept_invite', {
    p_token: token,
    p_user_id: userId,
    p_family_id: familyId,
  })

  if (error) throw error

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', userId)
    .maybeSingle()

  void logActivity(familyId, 'member.joined', {
    name: profile?.name ?? profile?.email ?? 'Someone',
  })
}
