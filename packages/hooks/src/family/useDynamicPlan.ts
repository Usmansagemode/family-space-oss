import { useQuery } from '@tanstack/react-query'
import type { FamilyPlan, PlanLimits } from '@family/types'
import { PLAN_LIMITS } from '@family/types'
import { getSupabaseClient } from '@family/supabase'
import { mergePlanLimits } from '@family/utils'

async function fetchPlanFeaturesForPlan(
  plan: FamilyPlan,
): Promise<Array<{ featureKey: string; value: { enabled?: boolean; limit?: number | null } }>> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('plan_features')
    .select('feature_key, value')
    .eq('plan', plan)

  if (error) throw error
  return (data ?? []).map((r) => ({
    featureKey: r['feature_key'] as string,
    value: r['value'] as { enabled?: boolean; limit?: number | null },
  }))
}

async function fetchFamilyOverrides(
  familyId: string,
): Promise<Array<{ featureKey: string; value: { enabled?: boolean; limit?: number | null } }>> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('family_feature_overrides')
    .select('feature_key, value')
    .eq('family_id', familyId)

  if (error) throw error
  return (data ?? []).map((r) => ({
    featureKey: r['feature_key'] as string,
    value: r['value'] as { enabled?: boolean; limit?: number | null },
  }))
}

/**
 * Dynamic plan hook — fetches plan_features + family_feature_overrides from DB,
 * merges them (override wins), and returns a PlanLimits object.
 *
 * Falls back to the static PLAN_LIMITS constant on error or while loading.
 */
export function useDynamicPlan(familyId: string, plan: FamilyPlan): PlanLimits {
  // Static fallback for immediate / error cases
  const staticLimits = PLAN_LIMITS[plan]

  const { data: planFeatures } = useQuery({
    queryKey: ['plan_features', plan],
    queryFn: () => fetchPlanFeaturesForPlan(plan),
    staleTime: 10 * 60 * 1000, // 10 min — only changes when admin edits
    enabled: !!familyId,
  })

  const { data: overrides } = useQuery({
    queryKey: ['family_feature_overrides', familyId],
    queryFn: () => fetchFamilyOverrides(familyId),
    staleTime: 60 * 1000, // 1 min
    enabled: !!familyId,
  })

  // If DB data not yet loaded, return static fallback (no flicker)
  if (!planFeatures || !overrides) return staticLimits

  return mergePlanLimits(plan, planFeatures, overrides) as PlanLimits
}
