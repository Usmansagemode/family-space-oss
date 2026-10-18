import type {
  AdminFamily,
  AdminProfile,
  AuditLogEntry,
  FamilyFeatureOverride,
  FamilyPlan,
  PlanFeature,
  PlatformStats,
} from '@family/types'
import { getServiceClient } from './client'

// ---------------------------------------------------------------------------
// Internal audit log writer — called by every mutating function
// ---------------------------------------------------------------------------

async function writeAuditLog(opts: {
  adminId: string
  action: string
  targetType: 'family' | 'user' | 'invite' | 'feature_flag'
  targetId?: string | null
  payload?: Record<string, unknown>
}): Promise<void> {
  const supabase = getServiceClient()
  await supabase.from('admin_audit_log').insert({
    admin_id: opts.adminId,
    action: opts.action,
    target_type: opts.targetType,
    target_id: opts.targetId ?? null,
    payload: opts.payload ?? {},
  })
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapAdminFamily(row: Record<string, unknown>): AdminFamily {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    plan: (row['plan'] ?? 'free') as FamilyPlan,
    currency: (row['currency'] ?? 'USD') as string,
    memberCount: (row['member_count'] as number) ?? 0,
    expenseCount: (row['expense_count'] as number) ?? 0,
    suspendedAt: row['suspended_at'] ? new Date(row['suspended_at'] as string) : null,
    suspendReason: (row['suspend_reason'] as string | null) ?? null,
    stripeCustomerId: (row['stripe_customer_id'] as string | null) ?? null,
    stripeSubscriptionId: (row['stripe_subscription_id'] as string | null) ?? null,
    stripeSubscriptionStatus: (row['stripe_subscription_status'] as string | null) ?? null,
    createdAt: new Date(row['created_at'] as string),
  }
}

function mapAdminProfile(row: Record<string, unknown>): AdminProfile {
  return {
    id: row['id'] as string,
    name: (row['name'] as string | null) ?? null,
    email: (row['email'] as string | null) ?? null,
    avatarUrl: (row['avatar_url'] as string | null) ?? null,
    isAdmin: (row['is_admin'] as boolean) ?? false,
    bannedAt: row['banned_at'] ? new Date(row['banned_at'] as string) : null,
    banReason: (row['ban_reason'] as string | null) ?? null,
    familyCount: (row['family_count'] as number) ?? 0,
    createdAt: new Date(row['created_at'] as string),
  }
}

function mapAuditLogEntry(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row['id'] as string,
    adminId: (row['admin_id'] as string | null) ?? null,
    adminName: (row['admin_name'] as string | null) ?? null,
    action: row['action'] as string,
    targetType: row['target_type'] as string,
    targetId: (row['target_id'] as string | null) ?? null,
    payload: (row['payload'] as Record<string, unknown>) ?? {},
    createdAt: new Date(row['created_at'] as string),
  }
}

function mapPlanFeature(row: Record<string, unknown>): PlanFeature {
  return {
    plan: row['plan'] as FamilyPlan,
    featureKey: row['feature_key'] as string,
    value: row['value'] as { enabled?: boolean; limit?: number | null },
  }
}

function mapFamilyFeatureOverride(row: Record<string, unknown>): FamilyFeatureOverride {
  return {
    id: row['id'] as string,
    familyId: row['family_id'] as string,
    featureKey: row['feature_key'] as string,
    value: row['value'] as { enabled?: boolean; limit?: number | null },
    note: (row['note'] as string | null) ?? null,
    createdBy: (row['created_by'] as string | null) ?? null,
    createdAt: new Date(row['created_at'] as string),
  }
}

// ---------------------------------------------------------------------------
// Platform stats
// ---------------------------------------------------------------------------

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const supabase = getServiceClient()

  const [familiesRes, usersRes, invitesRes] = await Promise.all([
    supabase.from('families').select('plan, suspended_at'),
    supabase.from('profiles').select('banned_at'),
    supabase.from('invites').select('id').is('used_at', null),
  ])

  const families = (familiesRes.data ?? []) as Array<{
    plan: string
    suspended_at: string | null
  }>
  const users = (usersRes.data ?? []) as Array<{ banned_at: string | null }>
  const invites = invitesRes.data ?? []

  return {
    totalFamilies: families.length,
    totalUsers: users.length,
    freeFamilies: families.filter((f) => f.plan === 'free').length,
    plusFamilies: families.filter((f) => f.plan === 'plus').length,
    proFamilies: families.filter((f) => f.plan === 'pro').length,
    suspendedFamilies: families.filter((f) => f.suspended_at !== null).length,
    bannedUsers: users.filter((u) => u.banned_at !== null).length,
    pendingInvites: invites.length,
  }
}

// ---------------------------------------------------------------------------
// Families
// ---------------------------------------------------------------------------

export async function fetchAllFamilies(opts?: {
  page?: number
  pageSize?: number
  plan?: FamilyPlan | 'all'
  suspended?: boolean
  search?: string
}): Promise<{ data: AdminFamily[]; total: number }> {
  const supabase = getServiceClient()
  const page = opts?.page ?? 0
  const pageSize = opts?.pageSize ?? 50
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('families')
    .select(
      `
      id, name, plan, currency,
      stripe_customer_id, stripe_subscription_id, stripe_subscription_status,
      suspended_at, suspend_reason, created_at,
      member_count:user_families(count),
      expense_count:expenses(count)
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.plan && opts.plan !== 'all') {
    query = query.eq('plan', opts.plan)
  }
  if (opts?.suspended === true) {
    query = query.not('suspended_at', 'is', null)
  } else if (opts?.suspended === false) {
    query = query.is('suspended_at', null)
  }
  if (opts?.search) {
    query = query.ilike('name', `%${opts.search}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const memberArr = r['member_count'] as Array<{ count: number }> | null
    const expenseArr = r['expense_count'] as Array<{ count: number }> | null
    return mapAdminFamily({
      ...r,
      member_count: memberArr?.[0]?.count ?? 0,
      expense_count: expenseArr?.[0]?.count ?? 0,
    })
  })

  return { data: rows, total: count ?? 0 }
}

export async function fetchFamilyAdmin(id: string): Promise<AdminFamily> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('families')
    .select(
      `
      id, name, plan, currency,
      stripe_customer_id, stripe_subscription_id, stripe_subscription_status,
      suspended_at, suspend_reason, created_at,
      member_count:user_families(count),
      expense_count:expenses(count)
    `,
    )
    .eq('id', id)
    .single()

  if (error) throw error
  const r = data as Record<string, unknown>
  const memberArr = r['member_count'] as Array<{ count: number }> | null
  const expenseArr = r['expense_count'] as Array<{ count: number }> | null
  return mapAdminFamily({
    ...r,
    member_count: memberArr?.[0]?.count ?? 0,
    expense_count: expenseArr?.[0]?.count ?? 0,
  })
}

export async function updateFamilyPlan(
  familyId: string,
  plan: FamilyPlan,
  adminId: string,
  reason?: string,
): Promise<void> {
  const supabase = getServiceClient()
  const { data: existing } = await supabase
    .from('families')
    .select('plan')
    .eq('id', familyId)
    .single()

  const { error } = await supabase.from('families').update({ plan }).eq('id', familyId)
  if (error) throw error

  await writeAuditLog({
    adminId,
    action: 'family.plan_changed',
    targetType: 'family',
    targetId: familyId,
    payload: {
      previousPlan: (existing as Record<string, unknown> | null)?.['plan'] ?? null,
      newPlan: plan,
      reason: reason ?? null,
    },
  })
}

export async function suspendFamily(
  familyId: string,
  adminId: string,
  reason: string,
): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('families')
    .update({
      suspended_at: new Date().toISOString(),
      suspended_by: adminId,
      suspend_reason: reason,
    })
    .eq('id', familyId)

  if (error) throw error

  await writeAuditLog({
    adminId,
    action: 'family.suspended',
    targetType: 'family',
    targetId: familyId,
    payload: { reason },
  })
}

export async function unsuspendFamily(familyId: string, adminId: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('families')
    .update({ suspended_at: null, suspended_by: null, suspend_reason: null })
    .eq('id', familyId)

  if (error) throw error

  await writeAuditLog({
    adminId,
    action: 'family.unsuspended',
    targetType: 'family',
    targetId: familyId,
  })
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function fetchAllUsers(opts?: {
  page?: number
  pageSize?: number
  banned?: boolean
  search?: string
}): Promise<{ data: AdminProfile[]; total: number }> {
  const supabase = getServiceClient()
  const page = opts?.page ?? 0
  const pageSize = opts?.pageSize ?? 50
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('profiles')
    .select(
      `
      id, name, email, avatar_url, is_admin, banned_at, ban_reason, created_at,
      family_count:user_families(count)
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.banned === true) {
    query = query.not('banned_at', 'is', null)
  } else if (opts?.banned === false) {
    query = query.is('banned_at', null)
  }
  if (opts?.search) {
    query = query.or(`name.ilike.%${opts.search}%,email.ilike.%${opts.search}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const familyArr = r['family_count'] as Array<{ count: number }> | null
    return mapAdminProfile({ ...r, family_count: familyArr?.[0]?.count ?? 0 })
  })

  return { data: rows, total: count ?? 0 }
}

export async function fetchUserAdmin(id: string): Promise<AdminProfile> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      id, name, email, avatar_url, is_admin, banned_at, ban_reason, created_at,
      family_count:user_families(count)
    `,
    )
    .eq('id', id)
    .single()

  if (error) throw error
  const r = data as Record<string, unknown>
  const familyArr = r['family_count'] as Array<{ count: number }> | null
  return mapAdminProfile({ ...r, family_count: familyArr?.[0]?.count ?? 0 })
}

export async function banUser(
  userId: string,
  adminId: string,
  reason: string,
): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      banned_at: new Date().toISOString(),
      banned_by: adminId,
      ban_reason: reason,
    })
    .eq('id', userId)

  if (error) throw error

  await writeAuditLog({
    adminId,
    action: 'user.banned',
    targetType: 'user',
    targetId: userId,
    payload: { reason },
  })
}

export async function unbanUser(userId: string, adminId: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({ banned_at: null, banned_by: null, ban_reason: null })
    .eq('id', userId)

  if (error) throw error

  await writeAuditLog({
    adminId,
    action: 'user.unbanned',
    targetType: 'user',
    targetId: userId,
  })
}

export async function promoteUserToAdmin(userId: string, adminId: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', userId)

  if (error) throw error

  await writeAuditLog({
    adminId,
    action: 'user.promoted_to_admin',
    targetType: 'user',
    targetId: userId,
  })
}

export async function demoteAdminUser(userId: string, adminId: string): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: false })
    .eq('id', userId)

  if (error) throw error

  await writeAuditLog({
    adminId,
    action: 'user.demoted_from_admin',
    targetType: 'user',
    targetId: userId,
  })
}

// ---------------------------------------------------------------------------
// Family members (admin view)
// ---------------------------------------------------------------------------

export type AdminFamilyMember = {
  userId: string
  name: string | null
  email: string | null
  avatarUrl: string | null
  role: 'owner' | 'member'
  joinedAt: Date
}

export async function fetchFamilyMembersAdmin(
  familyId: string,
): Promise<AdminFamilyMember[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('user_families')
    .select('user_id, role, joined_at, profiles(name, email, avatar_url)')
    .eq('family_id', familyId)
    .order('joined_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const profile = r['profiles'] as {
      name: string | null
      email: string | null
      avatar_url: string | null
    } | null
    return {
      userId: r['user_id'] as string,
      name: profile?.name ?? null,
      email: profile?.email ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      role: r['role'] as 'owner' | 'member',
      joinedAt: new Date(r['joined_at'] as string),
    }
  })
}

// ---------------------------------------------------------------------------
// User families (admin view)
// ---------------------------------------------------------------------------

export type AdminUserFamily = {
  familyId: string
  familyName: string
  role: 'owner' | 'member'
  plan: string
  joinedAt: Date
}

export async function fetchUserFamiliesAdmin(
  userId: string,
): Promise<AdminUserFamily[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('user_families')
    .select('family_id, role, joined_at, families(name, plan)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const family = r['families'] as { name: string; plan: string } | null
    return {
      familyId: r['family_id'] as string,
      familyName: family?.name ?? '(Unknown)',
      role: r['role'] as 'owner' | 'member',
      plan: family?.plan ?? 'free',
      joinedAt: new Date(r['joined_at'] as string),
    }
  })
}

// ---------------------------------------------------------------------------
// Plan features (DB-backed feature matrix)
// ---------------------------------------------------------------------------

export async function fetchPlanFeatures(): Promise<PlanFeature[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('plan_features')
    .select('plan, feature_key, value')
    .order('plan')
    .order('feature_key')

  if (error) throw error
  return (data ?? []).map((r) => mapPlanFeature(r as Record<string, unknown>))
}

export async function updatePlanFeature(
  plan: FamilyPlan,
  featureKey: string,
  value: { enabled?: boolean; limit?: number | null },
  adminId: string,
): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('plan_features')
    .upsert({ plan, feature_key: featureKey, value, updated_at: new Date().toISOString() }, { onConflict: 'plan,feature_key' })

  if (error) throw error

  await writeAuditLog({
    adminId,
    action: 'feature_flag.plan_updated',
    targetType: 'feature_flag',
    payload: { plan, featureKey, value },
  })
}

// ---------------------------------------------------------------------------
// Family feature overrides
// ---------------------------------------------------------------------------

export async function fetchFamilyFeatureOverrides(
  familyId: string,
): Promise<FamilyFeatureOverride[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('family_feature_overrides')
    .select('*')
    .eq('family_id', familyId)
    .order('feature_key')

  if (error) throw error
  return (data ?? []).map((r) => mapFamilyFeatureOverride(r as Record<string, unknown>))
}

export async function setFamilyFeatureOverride(
  familyId: string,
  featureKey: string,
  value: { enabled?: boolean; limit?: number | null },
  note: string | null,
  adminId: string,
): Promise<void> {
  const supabase = getServiceClient()
  const { error } = await supabase.from('family_feature_overrides').upsert({
    family_id: familyId,
    feature_key: featureKey,
    value,
    note,
    created_by: adminId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'family_id,feature_key' })

  if (error) throw error

  await writeAuditLog({
    adminId,
    action: 'feature_flag.override_set',
    targetType: 'feature_flag',
    targetId: familyId,
    payload: { familyId, featureKey, value, note },
  })
}

export async function removeFamilyFeatureOverride(
  overrideId: string,
  adminId: string,
): Promise<void> {
  const supabase = getServiceClient()
  const { data: existing } = await supabase
    .from('family_feature_overrides')
    .select('family_id, feature_key')
    .eq('id', overrideId)
    .single()

  const { error } = await supabase
    .from('family_feature_overrides')
    .delete()
    .eq('id', overrideId)

  if (error) throw error

  const r = existing as Record<string, unknown> | null
  await writeAuditLog({
    adminId,
    action: 'feature_flag.override_removed',
    targetType: 'feature_flag',
    targetId: r?.['family_id'] as string | null,
    payload: { overrideId, featureKey: r?.['feature_key'] ?? null },
  })
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export type AdminInvite = {
  id: string
  token: string
  familyId: string
  familyName: string
  createdBy: string | null
  createdAt: Date
}

export async function fetchAllInvites(): Promise<AdminInvite[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('invites')
    .select('id, token, family_id, created_by, created_at, families(name)')
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const family = r['families'] as { name: string } | null
    return {
      id: r['id'] as string,
      token: r['token'] as string,
      familyId: r['family_id'] as string,
      familyName: family?.name ?? '(Unknown)',
      createdBy: (r['created_by'] as string | null) ?? null,
      createdAt: new Date(r['created_at'] as string),
    }
  })
}

export async function revokeInvite(token: string, adminId: string): Promise<void> {
  const supabase = getServiceClient()
  const { data: existing } = await supabase
    .from('invites')
    .select('id, family_id')
    .eq('token', token)
    .single()

  const { error } = await supabase.from('invites').delete().eq('token', token)
  if (error) throw error

  const r = existing as Record<string, unknown> | null
  await writeAuditLog({
    adminId,
    action: 'invite.revoked',
    targetType: 'invite',
    targetId: r?.['id'] as string | null,
    payload: { token, familyId: r?.['family_id'] ?? null },
  })
}

// ---------------------------------------------------------------------------
// Dangerous delete — full cascade wipe for testing / GDPR
// ---------------------------------------------------------------------------

/**
 * Permanently deletes a family and all its data:
 *   1. Unlinks system person spaces (bypasses the active_system_space_protected trigger)
 *   2. Deletes the family row — cascade removes everything: spaces, items,
 *      expenses, categories, invites, splits, user_families memberships, etc.
 *   3. Writes an audit log entry.
 *
 * Member auth accounts are NOT deleted — they just lose access to this family.
 */
export async function deleteFamilyCompletely(
  familyId: string,
  adminId: string,
): Promise<void> {
  const supabase = getServiceClient()

  // Snapshot for the audit log
  const { data: familySnap } = await supabase
    .from('families')
    .select('name')
    .eq('id', familyId)
    .single()
  const snap = familySnap as { name: string } | null

  // Unlink system person spaces first so the trigger doesn't block cascade
  const { error: unlinkErr } = await supabase
    .from('spaces')
    .update({ linked_user_id: null })
    .eq('family_id', familyId)
    .eq('is_system', true)
    .not('linked_user_id', 'is', null)
  if (unlinkErr) throw unlinkErr

  // Delete family — FK cascades wipe all related data
  const { error: deleteErr } = await supabase
    .from('families')
    .delete()
    .eq('id', familyId)
  if (deleteErr) throw deleteErr

  await writeAuditLog({
    adminId,
    action: 'family.deleted_completely',
    targetType: 'family',
    targetId: familyId,
    payload: { name: snap?.name ?? null },
  })
}

/**
 * Permanently deletes a user and everything they own:
 *   1. Finds all families where this user is the owner and deletes them
 *      (cascade removes: spaces, items, expenses, categories, invites, splits…)
 *   2. Deletes the auth.users row via the Admin API
 *      (cascade removes: profiles, user_families memberships in other families)
 *   3. Writes an audit log entry.
 *
 * After this call the user's email is free and they can sign up fresh.
 */
export async function deleteUserCompletely(
  userId: string,
  adminId: string,
): Promise<void> {
  const supabase = getServiceClient()

  // Snapshot profile for the audit log before anything is deleted
  const { data: profileSnap } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('id', userId)
    .single()
  const snap = profileSnap as { name: string | null; email: string | null } | null

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

  // Audit trail
  await writeAuditLog({
    adminId,
    action: 'user.deleted_completely',
    targetType: 'user',
    targetId: userId,
    payload: {
      name: snap?.name ?? null,
      email: snap?.email ?? null,
      ownedFamiliesDeleted: ownedIds.length,
    },
  })
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function fetchAdminAuditLog(opts?: {
  page?: number
  pageSize?: number
  action?: string
  since?: Date
  until?: Date
}): Promise<{ data: AuditLogEntry[]; total: number }> {
  const supabase = getServiceClient()
  const page = opts?.page ?? 0
  const pageSize = opts?.pageSize ?? 50
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('admin_audit_log')
    .select(
      `
      id, admin_id, action, target_type, target_id, payload, created_at,
      admin_name:profiles!admin_audit_log_admin_id_fkey(name)
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.action) {
    query = query.eq('action', opts.action)
  }
  if (opts?.since) {
    query = query.gte('created_at', opts.since.toISOString())
  }
  if (opts?.until) {
    query = query.lte('created_at', opts.until.toISOString())
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const profile = r['admin_name'] as { name: string | null } | null
    return mapAuditLogEntry({ ...r, admin_name: profile?.name ?? null })
  })

  return { data: rows, total: count ?? 0 }
}
