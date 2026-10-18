import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPlanFeatures, updatePlanFeature } from '@family/supabase'
import type { FamilyPlan } from '@family/types'
import { useAdminAuth } from '@/contexts/auth'
import { toast } from 'sonner'

export function usePlanFeatures() {
  return useQuery({
    queryKey: ['admin', 'plan-features'],
    queryFn: fetchPlanFeatures,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePlanFeatureMutations() {
  const qc = useQueryClient()
  const { adminUser } = useAdminAuth()
  const adminId = adminUser?.id ?? ''

  const update = useMutation({
    mutationFn: ({
      plan,
      featureKey,
      value,
    }: {
      plan: FamilyPlan
      featureKey: string
      value: { enabled?: boolean; limit?: number | null }
    }) => updatePlanFeature(plan, featureKey, value, adminId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'plan-features'] })
      // Also invalidate the client-side plan_features cache so web app picks up changes
      qc.invalidateQueries({ queryKey: ['plan_features'] })
      toast.success('Feature flag updated')
    },
    onError: () => toast.error('Failed to update feature flag'),
  })

  return { update }
}
