import type { FamilyPlan } from './Family'

export type AdminFamily = {
  id: string
  name: string
  plan: FamilyPlan
  currency: string
  memberCount: number
  expenseCount: number
  suspendedAt: Date | null
  suspendReason: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripeSubscriptionStatus: string | null
  createdAt: Date
}

export type AdminProfile = {
  id: string
  name: string | null
  email: string | null
  avatarUrl: string | null
  isAdmin: boolean
  bannedAt: Date | null
  banReason: string | null
  familyCount: number
  createdAt: Date
}

export type AuditLogEntry = {
  id: string
  adminId: string | null
  adminName: string | null
  action: string
  targetType: string
  targetId: string | null
  payload: Record<string, unknown>
  createdAt: Date
}

export type PlanFeature = {
  plan: FamilyPlan
  featureKey: string
  value: { enabled?: boolean; limit?: number | null }
}

export type FamilyFeatureOverride = {
  id: string
  familyId: string
  featureKey: string
  value: { enabled?: boolean; limit?: number | null }
  note: string | null
  createdBy: string | null
  createdAt: Date
}

export type PlatformStats = {
  totalFamilies: number
  totalUsers: number
  freeFamilies: number
  plusFamilies: number
  proFamilies: number
  suspendedFamilies: number
  bannedUsers: number
  pendingInvites: number
}
