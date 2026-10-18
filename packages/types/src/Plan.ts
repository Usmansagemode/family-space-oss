import type { FamilyPlan } from './Family'

export type FeatureKey =
  | 'members.limit'
  | 'splits.groupLimit'
  | 'charts'
  | 'charts.export'
  | 'import.ai'
  | 'expenses.duplicates'

export type FeatureKeyMeta = {
  label: string        // human-readable label (admin panel + UI)
  description: string  // one-line description for tooltips and billing UI
  section: string      // groups rows in admin panel
  type: 'boolean' | 'limit'
  iconName: string     // lucide icon name — apps map this to a component
}

export const FEATURE_KEY_META: Record<FeatureKey, FeatureKeyMeta> = {
  'members.limit': {
    label: 'Member limit',
    description: 'Maximum number of family members who can join',
    section: 'Settings',
    type: 'limit',
    iconName: 'Users',
  },
  'splits.groupLimit': {
    label: 'Split group limit',
    description: 'Number of expense split groups you can create',
    section: 'Expenses',
    type: 'limit',
    iconName: 'SplitSquareVertical',
  },
  'charts': {
    label: 'Analytics charts',
    description: 'Yearly expense analytics with 9 chart types',
    section: 'Charts',
    type: 'boolean',
    iconName: 'BarChart3',
  },
  'charts.export': {
    label: 'Export',
    description: 'Export expense data to CSV or PDF',
    section: 'Charts',
    type: 'boolean',
    iconName: 'FileDown',
  },
  'import.ai': {
    label: 'AI import',
    description: 'AI reads your bank statements and imports expenses automatically',
    section: 'Import',
    type: 'boolean',
    iconName: 'Sparkles',
  },
  'expenses.duplicates': {
    label: 'Duplicate detection',
    description: 'Flags potential duplicate expenses before saving',
    section: 'Expenses',
    type: 'boolean',
    iconName: 'Copy',
  },
}

export type PlanLimits = {
  membersLimit: number | null      // null = unlimited
  splitGroupsLimit: number | null  // null = unlimited
  can: {
    charts: boolean
    chartsExport: boolean
    importAi: boolean
    expensesDuplicates: boolean
  }
}

export const PLAN_LIMITS: Record<FamilyPlan, PlanLimits> = {
  free: {
    membersLimit: 3,
    splitGroupsLimit: 1,
    can: { charts: false, chartsExport: false, importAi: false, expensesDuplicates: false },
  },
  plus: {
    membersLimit: 5,
    splitGroupsLimit: null,
    can: { charts: true, chartsExport: true, importAi: false, expensesDuplicates: true },
  },
  pro: {
    membersLimit: null,
    splitGroupsLimit: null,
    can: { charts: true, chartsExport: true, importAi: true, expensesDuplicates: true },
  },
}
