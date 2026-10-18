import type { FamilyPlan, FeatureKey } from '@family/types'
import { useDynamicPlan } from './useDynamicPlan'

/**
 * Returns the resolved value for a single feature gate.
 * Boolean features return boolean; limit features return number | null (null = unlimited).
 *
 * Uses useDynamicPlan internally so admin overrides are always respected.
 */
export function useFeatureGate(
  familyId: string,
  plan: FamilyPlan,
  key: 'charts' | 'charts.export' | 'import.ai' | 'expenses.duplicates',
): boolean
export function useFeatureGate(
  familyId: string,
  plan: FamilyPlan,
  key: 'members.limit' | 'splits.groupLimit',
): number | null
export function useFeatureGate(
  familyId: string,
  plan: FamilyPlan,
  key: FeatureKey,
): boolean | number | null {
  const limits = useDynamicPlan(familyId, plan)
  switch (key) {
    case 'members.limit':       return limits.membersLimit
    case 'splits.groupLimit':   return limits.splitGroupsLimit
    case 'charts':              return limits.can.charts
    case 'charts.export':       return limits.can.chartsExport
    case 'import.ai':           return limits.can.importAi
    case 'expenses.duplicates': return limits.can.expensesDuplicates
  }
}
