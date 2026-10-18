import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteFamilyCompletely,
  fetchAllFamilies,
  fetchFamilyAdmin,
  fetchFamilyFeatureOverrides,
  fetchFamilyMembersAdmin,
  removeFamilyFeatureOverride,
  setFamilyFeatureOverride,
  suspendFamily,
  unsuspendFamily,
  updateFamilyPlan,
} from '@family/supabase'
import type { FamilyPlan } from '@family/types'
import { useAdminAuth } from '@/contexts/auth'
import { toast } from 'sonner'

export function useAdminFamilies(opts?: {
  page?: number
  plan?: FamilyPlan | 'all'
  suspended?: boolean
  search?: string
}) {
  return useQuery({
    queryKey: ['admin', 'families', opts],
    queryFn: () => fetchAllFamilies(opts),
  })
}

export function useAdminFamily(familyId: string) {
  return useQuery({
    queryKey: ['admin', 'family', familyId],
    queryFn: () => fetchFamilyAdmin(familyId),
    enabled: !!familyId,
  })
}

export function useAdminFamilyMembers(familyId: string) {
  return useQuery({
    queryKey: ['admin', 'family-members', familyId],
    queryFn: () => fetchFamilyMembersAdmin(familyId),
    enabled: !!familyId,
  })
}

export function useAdminFamilyOverrides(familyId: string) {
  return useQuery({
    queryKey: ['admin', 'family-overrides', familyId],
    queryFn: () => fetchFamilyFeatureOverrides(familyId),
    enabled: !!familyId,
  })
}

export function useAdminFamilyMutations() {
  const qc = useQueryClient()
  const { adminUser } = useAdminAuth()
  const adminId = adminUser?.id ?? ''

  const changePlan = useMutation({
    mutationFn: ({ familyId, plan, reason }: { familyId: string; plan: FamilyPlan; reason: string }) =>
      updateFamilyPlan(familyId, plan, adminId, reason),
    onSuccess: (_data, { familyId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'families'] })
      qc.invalidateQueries({ queryKey: ['admin', 'family', familyId] })
      toast.success('Plan updated')
    },
    onError: () => toast.error('Failed to update plan'),
  })

  const suspend = useMutation({
    mutationFn: ({ familyId, reason }: { familyId: string; reason: string }) =>
      suspendFamily(familyId, adminId, reason),
    onSuccess: (_data, { familyId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'families'] })
      qc.invalidateQueries({ queryKey: ['admin', 'family', familyId] })
      toast.success('Family suspended')
    },
    onError: () => toast.error('Failed to suspend family'),
  })

  const unsuspend = useMutation({
    mutationFn: ({ familyId }: { familyId: string }) =>
      unsuspendFamily(familyId, adminId),
    onSuccess: (_data, { familyId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'families'] })
      qc.invalidateQueries({ queryKey: ['admin', 'family', familyId] })
      toast.success('Family unsuspended')
    },
    onError: () => toast.error('Failed to unsuspend family'),
  })

  const setOverride = useMutation({
    mutationFn: ({
      familyId,
      featureKey,
      value,
      note,
    }: {
      familyId: string
      featureKey: string
      value: { enabled?: boolean; limit?: number | null }
      note: string
    }) => setFamilyFeatureOverride(familyId, featureKey, value, note, adminId),
    onSuccess: (_data, { familyId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'family-overrides', familyId] })
      toast.success('Override saved')
    },
    onError: () => toast.error('Failed to save override'),
  })

  const removeOverride = useMutation({
    mutationFn: ({ overrideId }: { overrideId: string }) =>
      removeFamilyFeatureOverride(overrideId, adminId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'family-overrides'] })
      toast.success('Override removed')
    },
    onError: () => toast.error('Failed to remove override'),
  })

  const deleteFamily = useMutation({
    mutationFn: ({ familyId }: { familyId: string }) =>
      deleteFamilyCompletely(familyId, adminId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'families'] })
      toast.success('Family and all its data permanently deleted')
    },
    onError: () => toast.error('Failed to delete family'),
  })

  return { changePlan, suspend, unsuspend, setOverride, removeOverride, deleteFamily }
}
