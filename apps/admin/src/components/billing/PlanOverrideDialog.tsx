import { useState } from 'react'
import type { FamilyPlan } from '@family/types'

type Props = {
  familyId: string
  currentPlan: FamilyPlan
  onConfirm: (plan: FamilyPlan, reason: string) => Promise<void>
  trigger: React.ReactNode
}

const PLANS: FamilyPlan[] = ['free', 'plus', 'pro']

export function PlanOverrideDialog({ currentPlan, onConfirm, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState<FamilyPlan>(currentPlan)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('Please provide a reason for the plan change.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onConfirm(plan, reason.trim())
      setOpen(false)
      setReason('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Override Plan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Change the family plan. This action is logged in the audit trail.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">New Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as FamilyPlan)}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {PLANS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Reason</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this plan being changed?"
                  rows={3}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
