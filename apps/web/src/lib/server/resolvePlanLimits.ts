import type { FamilyPlan } from '@family/types'
import { mergePlanLimits } from '@family/utils'
import type { PlanLimitsShape } from '@family/utils'
import { getSupabaseClient } from '@family/supabase'

/**
 * Server-only plan resolver — reads plan_features + family_feature_overrides directly
 * from Supabase (no React Query, suitable for TanStack Start loaders/actions).
 *
 * Override rows win over plan defaults. Falls back to static PLAN_LIMITS on error.
 */
export async function resolvePlanLimits(
  familyId: string,
  plan: FamilyPlan,
): Promise<PlanLimitsShape> {
  try {
    const supabase = getSupabaseClient()

    const [planFeaturesRes, overridesRes] = await Promise.all([
      supabase
        .from('plan_features')
        .select('feature_key, value')
        .eq('plan', plan),
      supabase
        .from('family_feature_overrides')
        .select('feature_key, value')
        .eq('family_id', familyId),
    ])

    const planFeatures = (planFeaturesRes.data ?? []).map((r) => ({
      featureKey: r['feature_key'] as string,
      value: r['value'] as { enabled?: boolean; limit?: number | null },
    }))

    const overrides = (overridesRes.data ?? []).map((r) => ({
      featureKey: r['feature_key'] as string,
      value: r['value'] as { enabled?: boolean; limit?: number | null },
    }))

    return mergePlanLimits(plan, planFeatures, overrides)
  } catch {
    // Fallback to static limits — never block the page on a flag fetch error
    return mergePlanLimits(plan, [], [])
  }
}
