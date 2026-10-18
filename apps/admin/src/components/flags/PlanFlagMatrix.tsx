import { useState } from 'react'
import { BarChart3, Copy, FileDown, Sparkles, SplitSquareVertical, Users } from 'lucide-react'
import type { PlanFeature, FamilyPlan, FeatureKey } from '@family/types'
import { FEATURE_KEY_META } from '@family/types'

type Props = {
  features: PlanFeature[]
  onUpdate: (
    plan: FamilyPlan,
    featureKey: string,
    value: { enabled?: boolean; limit?: number | null },
  ) => Promise<void>
}

const PLANS: FamilyPlan[] = ['free', 'plus', 'pro']

// Kept in sync with FEATURE_KEY_META[key].iconName
const FEATURE_ICONS: Record<FeatureKey, React.ElementType> = {
  'members.limit':       Users,
  'splits.groupLimit':   SplitSquareVertical,
  'charts':              BarChart3,
  'charts.export':       FileDown,
  'import.ai':           Sparkles,
  'expenses.duplicates': Copy,
}

export function PlanFlagMatrix({ features, onUpdate }: Props) {
  const [saving, setSaving] = useState<string | null>(null)

  // Build lookup: plan → featureKey → value
  const matrix = new Map<string, { enabled?: boolean; limit?: number | null }>()
  for (const f of features) {
    matrix.set(`${f.plan}:${f.featureKey}`, f.value)
  }

  // Group feature keys by section, preserving insertion order within each section
  const sections = new Map<string, FeatureKey[]>()
  for (const [key, meta] of Object.entries(FEATURE_KEY_META) as [FeatureKey, typeof FEATURE_KEY_META[FeatureKey]][]) {
    if (!sections.has(meta.section)) sections.set(meta.section, [])
    sections.get(meta.section)!.push(key)
  }

  async function handleToggle(plan: FamilyPlan, featureKey: string, current: boolean) {
    const key = `${plan}:${featureKey}`
    setSaving(key)
    try {
      await onUpdate(plan, featureKey, { enabled: !current })
    } finally {
      setSaving(null)
    }
  }

  async function handleLimitChange(plan: FamilyPlan, featureKey: string, raw: string) {
    const key = `${plan}:${featureKey}`
    setSaving(key)
    try {
      const limit = raw === '' || raw === 'null' ? null : parseInt(raw, 10)
      await onUpdate(plan, featureKey, { limit })
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="py-3 pl-4 pr-6 text-left font-semibold text-muted-foreground">
              Feature
            </th>
            {PLANS.map((p) => (
              <th key={p} className="px-6 py-3 text-center font-semibold capitalize">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...sections.entries()].map(([section, keys]) => (
            <>
              <tr key={`section-${section}`} className="border-b border-border bg-muted/20">
                <td
                  colSpan={PLANS.length + 1}
                  className="py-1.5 pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {section}
                </td>
              </tr>
              {keys.map((featureKey) => {
                const meta = FEATURE_KEY_META[featureKey]
                const Icon = FEATURE_ICONS[featureKey]
                const isBool = meta.type === 'boolean'
                return (
                  <tr key={featureKey} className="border-b border-border last:border-0">
                    <td className="py-3 pl-4 pr-6">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium leading-tight">{meta.label}</span>
                          <span className="text-xs text-muted-foreground leading-tight">{meta.description}</span>
                        </div>
                      </div>
                    </td>
                    {PLANS.map((plan) => {
                      const cellKey = `${plan}:${featureKey}`
                      const val = matrix.get(cellKey)
                      const isSaving = saving === cellKey

                      return (
                        <td key={plan} className="px-6 py-3 text-center">
                          {isBool ? (
                            <button
                              onClick={() => handleToggle(plan, featureKey, val?.enabled ?? false)}
                              disabled={isSaving}
                              aria-label={`Toggle ${meta.label} for ${plan}`}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                                val?.enabled
                                  ? 'bg-primary'
                                  : 'bg-muted-foreground/30'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                  val?.enabled ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          ) : (
                            <input
                              type="text"
                              defaultValue={val?.limit === null ? '' : String(val?.limit ?? '')}
                              onBlur={(e) => handleLimitChange(plan, featureKey, e.target.value)}
                              disabled={isSaving}
                              placeholder="∞"
                              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                            />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
