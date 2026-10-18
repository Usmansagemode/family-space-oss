import type { FamilyPlan, PlanLimits } from '@family/types'
import { PLAN_LIMITS } from '@family/types'
export type { PlanLimits as PlanLimitsShape }

type FeatureRow = {
  featureKey: string
  value: { enabled?: boolean; limit?: number | null }
}

/**
 * Merges plan_features rows + family_feature_overrides into a PlanLimits object.
 * Override rows always win over plan defaults.
 * Falls back to PLAN_LIMITS (from @family/types) if a row is missing.
 */
export function mergePlanLimits(
  plan: FamilyPlan,
  planFeatures: FeatureRow[],
  overrides: FeatureRow[],
): PlanLimits {
  const fallback = PLAN_LIMITS[plan]

  const resolved = new Map<string, { enabled?: boolean; limit?: number | null }>()

  for (const row of planFeatures) {
    resolved.set(row.featureKey, row.value)
  }
  for (const row of overrides) {
    resolved.set(row.featureKey, row.value)
  }

  function getBool(key: string, fallbackVal: boolean): boolean {
    const v = resolved.get(key)
    if (v === undefined) return fallbackVal
    return v.enabled ?? fallbackVal
  }

  function getLimit(key: string, fallbackVal: number | null): number | null {
    const v = resolved.get(key)
    if (v === undefined) return fallbackVal
    if ('limit' in v) return v.limit ?? null
    return fallbackVal
  }

  return {
    membersLimit:     getLimit('members.limit',       fallback.membersLimit),
    splitGroupsLimit: getLimit('splits.groupLimit',   fallback.splitGroupsLimit),
    can: {
      charts:             getBool('charts',              fallback.can.charts),
      chartsExport:       getBool('charts.export',       fallback.can.chartsExport),
      importAi:           getBool('import.ai',           fallback.can.importAi),
      expensesDuplicates: getBool('expenses.duplicates', fallback.can.expensesDuplicates),
    },
  }
}
