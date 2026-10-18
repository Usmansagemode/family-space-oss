import { useState } from 'react'
import type { ReactNode } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle, Crown, Trash2, TriangleAlert, User } from 'lucide-react'
import type { AdminFamily, FamilyPlan } from '@family/types'
import { AdminLayout } from '@/components/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PlanOverrideDialog } from '@/components/billing/PlanOverrideDialog'
import { StripeStatusBadge } from '@/components/billing/StripeStatusBadge'
import { FamilyOverrideRow } from '@/components/flags/FamilyOverrideRow'
import {
  useAdminFamily,
  useAdminFamilyMembers,
  useAdminFamilyMutations,
  useAdminFamilyOverrides,
} from '@/hooks/useAdminFamilies'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/families/$familyId')({
  component: FamilyDetailPage,
})

// ─── Dangerous Delete Dialog ──────────────────────────────────────────────────

function DangerousDeleteDialog({
  family,
  onDelete,
  trigger,
}: {
  family: AdminFamily
  onDelete: () => Promise<void>
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const isConfirmed = confirmText.trim() === family.name

  function handleOpen() {
    setConfirmText('')
    setOpen(true)
  }

  async function handleDelete() {
    if (!isConfirmed) return
    setLoading(true)
    try {
      await onDelete()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <span onClick={handleOpen} className="cursor-pointer">
        {trigger}
      </span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />

          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-destructive/30 bg-card shadow-2xl">
            {/* Red danger header */}
            <div className="flex items-start gap-3 border-b border-destructive/20 bg-destructive/5 px-6 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                <TriangleAlert className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-destructive">
                  Permanently delete family
                </h2>
                <p className="mt-0.5 text-sm text-destructive/80">
                  This action is <strong>irreversible</strong>. There is no undo.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-5 p-6">
              {/* Which family */}
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Deleting
                </p>
                <p className="mt-1 font-semibold">{family.name}</p>
                <p className="text-sm text-muted-foreground">
                  {family.memberCount} member{family.memberCount !== 1 ? 's' : ''} · {family.expenseCount} expense{family.expenseCount !== 1 ? 's' : ''}
                </p>
              </div>

              {/* What gets deleted */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">The following will be permanently erased:</p>
                <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  {[
                    'All grocery lists, columns, and items',
                    'All tasks and task assignments',
                    'All expenses, categories, and locations',
                    'All pending invites',
                    'All split groups and settlements',
                    'All feature overrides for this family',
                    'Member accounts are NOT deleted — they just lose access',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 translate-y-1.5 rounded-full bg-destructive/60" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Type to confirm */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  Type{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-destructive">
                    {family.name}
                  </code>{' '}
                  to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  placeholder={family.name}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={loading}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-destructive focus:ring-1 focus:ring-destructive disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  Paste is disabled — you must type it manually.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-border pt-2">
                <button
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!isConfirmed || loading}
                  className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white transition-opacity hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  {loading ? 'Deleting…' : 'Delete everything'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function FamilyDetailPage() {
  const { familyId } = Route.useParams()
  const navigate = useNavigate()
  const { data: family, isLoading } = useAdminFamily(familyId)
  const { data: overrides = [] } = useAdminFamilyOverrides(familyId)
  const { data: members = [] } = useAdminFamilyMembers(familyId)
  const { changePlan, suspend, unsuspend, setOverride, removeOverride, deleteFamily } =
    useAdminFamilyMutations()

  if (isLoading || !family) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-lg bg-muted" />
          <div className="h-48 rounded-xl bg-muted" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <PageHeader
          title={family.name}
          description={`ID: ${family.id}`}
          action={
            <div className="flex items-center gap-2">
              <PlanOverrideDialog
                familyId={familyId}
                currentPlan={family.plan}
                onConfirm={(plan: FamilyPlan, reason: string) =>
                  changePlan.mutateAsync({ familyId, plan, reason })
                }
                trigger={
                  <button className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent">
                    Change Plan
                  </button>
                }
              />
              <DangerousDeleteDialog
                family={family}
                onDelete={async () => {
                  await deleteFamily.mutateAsync({ familyId })
                  void navigate({ to: '/families' })
                }}
                trigger={
                  <button className="flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-sm font-semibold text-destructive hover:bg-destructive/15">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                }
              />

              {family.suspendedAt ? (
                <ConfirmDialog
                  title="Unsuspend family"
                  description={`Restore access for "${family.name}"?`}
                  confirmLabel="Unsuspend"
                  onConfirm={() => unsuspend.mutateAsync({ familyId })}
                  trigger={
                    <button className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <CheckCircle className="h-4 w-4" />
                      Unsuspend
                    </button>
                  }
                />
              ) : (
                <ConfirmDialog
                  title="Suspend family"
                  description={`Suspending "${family.name}" will show a full-screen block to all members. Enter a reason below.`}
                  confirmLabel="Suspend"
                  destructive
                  onConfirm={async () => {
                    const reason = window.prompt('Reason for suspension:')
                    if (reason) await suspend.mutateAsync({ familyId, reason })
                  }}
                  trigger={
                    <button className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20">
                      <AlertTriangle className="h-4 w-4" />
                      Suspend
                    </button>
                  }
                />
              )}
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Plan', value: family.plan },
            { label: 'Currency', value: family.currency },
            { label: 'Members', value: family.memberCount },
            { label: 'Expenses', value: family.expenseCount },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-xl font-semibold capitalize">{String(value)}</p>
            </div>
          ))}
        </div>

        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Billing</h2>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Stripe Customer</p>
              <p className="mt-0.5 font-mono text-xs">{family.stripeCustomerId ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subscription</p>
              <p className="mt-0.5 font-mono text-xs">{family.stripeSubscriptionId ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1">
                <StripeStatusBadge status={family.stripeSubscriptionStatus} />
              </div>
            </div>
          </div>
        </section>

        {family.suspendedAt && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              Suspended {formatDate(family.suspendedAt)}
            </p>
            {family.suspendReason && (
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-500">
                Reason: {family.suspendReason}
              </p>
            )}
          </div>
        )}

        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Members</h2>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {members.map((m) => (
                <Link
                  key={m.userId}
                  to="/users/$userId"
                  params={{ userId: m.userId }}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:text-primary"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name ?? '(no name)'}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email ?? m.userId}</p>
                  </div>
                  {m.role === 'owner' && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                      <Crown className="h-3 w-3" />
                      Owner
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(m.joinedAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Feature Overrides</h2>
          <p className="text-sm text-muted-foreground">
            Overrides apply on top of this family's plan defaults and win over the plan matrix.
          </p>
          <FamilyOverrideRow
            overrides={overrides}
            onAdd={(featureKey, value, note) =>
              setOverride.mutateAsync({ familyId, featureKey, value, note })
            }
            onRemove={(overrideId) => removeOverride.mutateAsync({ overrideId })}
          />
        </section>

        <p className="text-xs text-muted-foreground">
          Created {formatDate(family.createdAt)}
        </p>
      </div>
    </AdminLayout>
  )
}
