/**
 * Single source of truth for plan feature display in the web app.
 *
 * - FEATURE_KEY_META (packages/types) owns: label, description, section, type, iconName
 * - This file extends that with: React icon components, getValue, isEnabled, minPlan
 * - PLAN_UI owns: plan-level display (tagline, price, cta, tailwind classes)
 *
 * Both the billing settings tab and the upgrade prompt derive from here.
 * Adding a new gated feature = one entry in PLAN_FEATURES. Everything else auto-updates.
 */

import { BarChart3, Copy, FileDown, Sparkles, SplitSquareVertical, Users } from 'lucide-react'
import type React from 'react'
import type { FeatureKey, FamilyPlan, PlanLimits } from '@family/types'
import { FEATURE_KEY_META, PLAN_LIMITS } from '@family/types'

// ─── Icon map ──────────────────────────────────────────────────────────────
// Kept in sync with FEATURE_KEY_META[key].iconName
export const FEATURE_ICONS: Record<FeatureKey, React.ElementType> = {
  'members.limit':       Users,
  'splits.groupLimit':   SplitSquareVertical,
  'charts':              BarChart3,
  'charts.export':       FileDown,
  'import.ai':           Sparkles,
  'expenses.duplicates': Copy,
}

// ─── Feature display ───────────────────────────────────────────────────────

export type PlanFeatureDisplay = {
  key: FeatureKey
  /** From FEATURE_KEY_META */
  label: string
  /** From FEATURE_KEY_META */
  description: string
  /** From FEATURE_KEY_META */
  section: string
  /** Lucide component */
  icon: React.ElementType
  /** Earliest plan that provides this feature */
  minPlan: 'free' | 'plus' | 'pro'
  /** Human-readable value for a given plan's resolved limits */
  getValue: (limits: PlanLimits) => string
  /** Whether this feature is active under a given plan's resolved limits */
  isEnabled: (limits: PlanLimits) => boolean
}

/** Derive which plan first enables a boolean feature from static PLAN_LIMITS */
function boolMinPlan(key: FeatureKey): 'free' | 'plus' | 'pro' {
  if (getBoolValue(PLAN_LIMITS.free, key)) return 'free'
  if (getBoolValue(PLAN_LIMITS.plus, key)) return 'plus'
  return 'pro'
}

function getBoolValue(limits: PlanLimits, key: FeatureKey): boolean {
  switch (key) {
    case 'charts':              return limits.can.charts
    case 'charts.export':       return limits.can.chartsExport
    case 'import.ai':           return limits.can.importAi
    case 'expenses.duplicates': return limits.can.expensesDuplicates
    default:                    return false
  }
}

export const PLAN_FEATURES: PlanFeatureDisplay[] = [
  {
    key: 'members.limit',
    ...FEATURE_KEY_META['members.limit'],
    icon: FEATURE_ICONS['members.limit'],
    minPlan: 'free',
    getValue: (l) => l.membersLimit === null ? 'Unlimited' : `Up to ${l.membersLimit}`,
    isEnabled: () => true,
  },
  {
    key: 'splits.groupLimit',
    ...FEATURE_KEY_META['splits.groupLimit'],
    icon: FEATURE_ICONS['splits.groupLimit'],
    minPlan: 'free',
    getValue: (l) => l.splitGroupsLimit === null ? 'Unlimited groups' : `Up to ${l.splitGroupsLimit} group`,
    isEnabled: () => true,
  },
  {
    key: 'expenses.duplicates',
    ...FEATURE_KEY_META['expenses.duplicates'],
    icon: FEATURE_ICONS['expenses.duplicates'],
    minPlan: boolMinPlan('expenses.duplicates'),
    getValue: (l) => l.can.expensesDuplicates ? 'Included' : 'Not included',
    isEnabled: (l) => l.can.expensesDuplicates,
  },
  {
    key: 'charts',
    ...FEATURE_KEY_META['charts'],
    icon: FEATURE_ICONS['charts'],
    minPlan: boolMinPlan('charts'),
    getValue: (l) => l.can.charts ? '9 charts included' : 'Not included',
    isEnabled: (l) => l.can.charts,
  },
  {
    key: 'charts.export',
    ...FEATURE_KEY_META['charts.export'],
    icon: FEATURE_ICONS['charts.export'],
    minPlan: boolMinPlan('charts.export'),
    getValue: (l) => l.can.chartsExport ? 'Included' : 'Not included',
    isEnabled: (l) => l.can.chartsExport,
  },
  {
    key: 'import.ai',
    ...FEATURE_KEY_META['import.ai'],
    icon: FEATURE_ICONS['import.ai'],
    minPlan: boolMinPlan('import.ai'),
    getValue: (l) => l.can.importAi ? 'Included' : 'Not included',
    isEnabled: (l) => l.can.importAi,
  },
]

// ─── Upgrade card helpers ──────────────────────────────────────────────────

/**
 * Features to highlight on an upgrade card for `targetPlan`.
 * Boolean features: those first unlocked at `targetPlan`.
 * Limit features: those whose display value improves vs. the prior tier.
 */
export function getUpgradeCardFeatures(targetPlan: 'plus' | 'pro'): PlanFeatureDisplay[] {
  const prevPlan: FamilyPlan = targetPlan === 'plus' ? 'free' : 'plus'
  return PLAN_FEATURES.filter((f) => {
    if (FEATURE_KEY_META[f.key].type === 'boolean') {
      return f.isEnabled(PLAN_LIMITS[targetPlan]) && !f.isEnabled(PLAN_LIMITS[prevPlan])
    }
    // Limit: show when the value improves across tiers
    return f.getValue(PLAN_LIMITS[targetPlan]) !== f.getValue(PLAN_LIMITS[prevPlan])
  })
}

// ─── Plan-level display ────────────────────────────────────────────────────

export type PlanUIMeta = {
  label: string
  price: string
  tagline: string
  cta: string
  /** Tailwind classes for the plan card container */
  cardClass: string
  /** Tailwind classes for the price/plan badge */
  badgeClass: string
}

export const PLAN_UI: Record<FamilyPlan, PlanUIMeta> = {
  free: {
    label: 'Free',
    price: 'Free forever',
    tagline: 'Core expenses, grocery lists & chores.',
    cta: 'Get started free',
    cardClass: 'border-border bg-muted/30',
    badgeClass: 'bg-muted text-muted-foreground border border-border',
  },
  plus: {
    label: 'Plus',
    price: '$5 / month',
    tagline: 'Analytics, export & duplicate detection.',
    cta: 'Upgrade to Plus',
    cardClass: 'border-primary/20 bg-primary/5',
    badgeClass: 'bg-primary text-primary-foreground',
  },
  pro: {
    label: 'Pro',
    price: '$10 / month',
    tagline: 'AI import & unlimited everything.',
    cta: 'Upgrade to Pro',
    cardClass: 'border-violet-200 bg-violet-50/60 dark:border-violet-800/30 dark:bg-violet-950/20',
    badgeClass: 'bg-violet-600 text-white',
  },
}
