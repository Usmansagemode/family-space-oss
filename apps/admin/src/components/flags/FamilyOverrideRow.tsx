import { useState } from 'react'
import { BarChart3, Copy, FileDown, Plus, Sparkles, SplitSquareVertical, Trash2, Users } from 'lucide-react'
import type { FamilyFeatureOverride, FeatureKey } from '@family/types'
import { FEATURE_KEY_META } from '@family/types'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { timeAgo } from '@/lib/utils'

type Props = {
  overrides: FamilyFeatureOverride[]
  onAdd: (
    featureKey: string,
    value: { enabled?: boolean; limit?: number | null },
    note: string,
  ) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

// Kept in sync with FEATURE_KEY_META[key].iconName
const FEATURE_ICONS: Record<FeatureKey, React.ElementType> = {
  'members.limit':       Users,
  'splits.groupLimit':   SplitSquareVertical,
  'charts':              BarChart3,
  'charts.export':       FileDown,
  'import.ai':           Sparkles,
  'expenses.duplicates': Copy,
}

const FEATURE_KEYS = Object.keys(FEATURE_KEY_META) as FeatureKey[]
const FIRST_KEY = FEATURE_KEYS[0]!

export function FamilyOverrideRow({ overrides, onAdd, onRemove }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [featureKey, setFeatureKey] = useState<string>(FIRST_KEY)
  const [boolVal, setBoolVal] = useState(true)
  const [limitVal, setLimitVal] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedMeta = FEATURE_KEY_META[featureKey as FeatureKey]
  const isBool = selectedMeta?.type === 'boolean'

  async function handleAdd() {
    setSaving(true)
    try {
      const value = isBool ? { enabled: boolVal } : { limit: limitVal === '' ? null : parseInt(limitVal, 10) }
      await onAdd(featureKey, value, note)
      setAddOpen(false)
      setNote('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {overrides.length === 0 ? (
        <p className="text-sm text-muted-foreground">No overrides — plan defaults apply.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-2 pl-3 pr-4 text-left font-semibold text-muted-foreground">Feature</th>
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Value</th>
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Note</th>
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Added</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {overrides.map((ov) => {
                const ovKey = ov.featureKey as FeatureKey
                const meta = FEATURE_KEY_META[ovKey]
                const Icon = FEATURE_ICONS[ovKey]
                return (
                  <tr key={ov.id} className="border-b border-border last:border-0">
                    <td className="py-2 pl-3 pr-4">
                      <div className="flex items-center gap-2">
                        {Icon && (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                            <Icon className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium leading-tight">{meta?.label ?? ov.featureKey}</span>
                          {meta?.description && (
                            <span className="text-xs text-muted-foreground leading-tight">{meta.description}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {ov.value.enabled !== undefined
                        ? ov.value.enabled ? 'Enabled' : 'Disabled'
                        : ov.value.limit === null
                        ? '∞ unlimited'
                        : String(ov.value.limit)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{ov.note ?? '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{timeAgo(ov.createdAt)}</td>
                    <td className="px-3 py-2">
                      <ConfirmDialog
                        title="Remove override"
                        description={`Remove the "${meta?.label ?? ov.featureKey}" override? The plan default will apply again.`}
                        confirmLabel="Remove"
                        destructive
                        onConfirm={() => onRemove(ov.id)}
                        trigger={
                          <button className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        }
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={() => setAddOpen(true)}
        className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Add override
      </button>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !saving && setAddOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Add Feature Override</h2>
            <div className="mt-4 flex flex-col gap-4">

              {/* Feature selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Feature</label>
                <div className="flex flex-col gap-1 rounded-lg border border-border overflow-hidden">
                  {FEATURE_KEYS.map((k) => {
                    const meta = FEATURE_KEY_META[k]
                    const Icon = FEATURE_ICONS[k]
                    const isSelected = featureKey === k
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setFeatureKey(k)}
                        className={`flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 ${
                          isSelected ? 'bg-muted' : ''
                        } border-b border-border last:border-0`}
                      >
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium leading-tight">{meta.label}</div>
                          <div className="truncate text-xs text-muted-foreground">{meta.description}</div>
                        </div>
                        {isSelected && (
                          <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Value input */}
              {isBool ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Value</label>
                  <select
                    value={String(boolVal)}
                    onChange={(e) => setBoolVal(e.target.value === 'true')}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Limit (leave blank for unlimited)</label>
                  <input
                    type="text"
                    value={limitVal}
                    onChange={(e) => setLimitVal(e.target.value)}
                    placeholder="e.g. 10 — or leave blank for ∞"
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why this override?"
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setAddOpen(false)}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
