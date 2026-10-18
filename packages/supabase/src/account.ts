import { getServiceClient } from './client'

/**
 * Permanently deletes a user: unlinks system person spaces in the families
 * they own, deletes those families (cascading all family data), then deletes
 * the auth user (cascading profiles and remaining memberships).
 * Requires the service-role client — server-side only.
 */
export async function deleteUserCompletely(userId: string): Promise<void> {
  const supabase = getServiceClient()

  // Find every family this user owns
  const { data: memberships, error: memberErr } = await supabase
    .from('user_families')
    .select('family_id, role')
    .eq('user_id', userId)
  if (memberErr) throw memberErr

  const ownedIds = ((memberships ?? []) as Array<{ family_id: string; role: string }>)
    .filter((m) => m.role === 'owner')
    .map((m) => m.family_id)

  // Delete owned families → FK cascades wipe all family data
  if (ownedIds.length > 0) {
    // The trigger `trg_prevent_active_system_space_delete` blocks deleting a
    // space while linked_user_id is set. Unlink all system person spaces in
    // the owned families first so the trigger doesn't fire during cascade.
    const { error: unlinkErr } = await supabase
      .from('spaces')
      .update({ linked_user_id: null })
      .in('family_id', ownedIds)
      .eq('is_system', true)
      .not('linked_user_id', 'is', null)
    if (unlinkErr) throw unlinkErr

    const { error: familyErr } = await supabase
      .from('families')
      .delete()
      .in('id', ownedIds)
    if (familyErr) throw familyErr
  }

  // Delete the auth user → cascades to profiles + any remaining user_families
  const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
  if (authErr) throw authErr
}
