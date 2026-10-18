import { useState } from 'react'
import type { ReactNode } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Ban, CheckCircle, Crown, Shield, ShieldOff, TriangleAlert, Trash2, Users } from 'lucide-react'
import type { AdminProfile } from '@family/types'
import { AdminLayout } from '@/components/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAdminUser, useAdminUserFamilies, useAdminUserMutations } from '@/hooks/useAdminUsers'
import { formatDate } from '@/lib/utils'

export const Route = createFileRoute('/users/$userId')({
  component: UserDetailPage,
})

// ─── Dangerous Delete Dialog ──────────────────────────────────────────────────

function DangerousDeleteDialog({
  user,
  onDelete,
  trigger,
}: {
  user: AdminProfile
  onDelete: () => Promise<void>
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  // The user must type the email (or name if no email) exactly to confirm
  const confirmTarget = user.email ?? user.name ?? user.id
  const isConfirmed = confirmText.trim() === confirmTarget

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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-destructive/30 bg-card shadow-2xl">

            {/* Red danger header */}
            <div className="flex items-start gap-3 border-b border-destructive/20 bg-destructive/5 px-6 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                <TriangleAlert className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-destructive">
                  Permanently delete user
                </h2>
                <p className="mt-0.5 text-sm text-destructive/80">
                  This action is <strong>irreversible</strong>. There is no undo.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-5 p-6">
              {/* Who */}
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Deleting
                </p>
                <p className="mt-1 font-semibold">{user.name ?? '(no name)'}</p>
                {user.email && (
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                )}
              </div>

              {/* What gets deleted */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">The following will be permanently erased:</p>
                <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                  {[
                    'Auth account — email freed up for re-signup',
                    'Profile and all personal data',
                    'Their family and every member in it',
                    'All grocery lists, items, and chores',
                    'All expenses and expense categories',
                    'All pending invites',
                    'All split groups and settlements',
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
                    {confirmTarget}
                  </code>{' '}
                  to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  placeholder={confirmTarget}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={loading}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-0 transition-colors placeholder:text-muted-foreground/50 focus:border-destructive focus:ring-1 focus:ring-destructive disabled:opacity-50"
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

// ─── Page ─────────────────────────────────────────────────────────────────────

function UserDetailPage() {
  const { userId } = Route.useParams()
  const navigate = useNavigate()
  const { data: user, isLoading } = useAdminUser(userId)
  const { data: families = [] } = useAdminUserFamilies(userId)
  const { ban, unban, promote, demote, deleteUser } = useAdminUserMutations()

  if (isLoading || !user) {
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
          title={user.name ?? user.email ?? 'User'}
          description={`ID: ${user.id}`}
          action={
            <div className="flex items-center gap-2">
              {user.isAdmin ? (
                <ConfirmDialog
                  title="Remove admin privileges"
                  description={`Remove admin access for ${user.name ?? user.email}?`}
                  confirmLabel="Remove"
                  destructive
                  onConfirm={() => demote.mutateAsync({ userId })}
                  trigger={
                    <button className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent">
                      <ShieldOff className="h-4 w-4" />
                      Remove Admin
                    </button>
                  }
                />
              ) : (
                <ConfirmDialog
                  title="Promote to admin"
                  description={`Grant ${user.name ?? user.email} full admin access to this portal?`}
                  confirmLabel="Promote"
                  onConfirm={() => promote.mutateAsync({ userId })}
                  trigger={
                    <button className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent">
                      <Shield className="h-4 w-4" />
                      Make Admin
                    </button>
                  }
                />
              )}

              {user.bannedAt ? (
                <ConfirmDialog
                  title="Unban user"
                  description={`Restore account access for ${user.name ?? user.email}?`}
                  confirmLabel="Unban"
                  onConfirm={() => unban.mutateAsync({ userId })}
                  trigger={
                    <button className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <CheckCircle className="h-4 w-4" />
                      Unban
                    </button>
                  }
                />
              ) : (
                <ConfirmDialog
                  title="Ban user"
                  description={`This will block ${user.name ?? user.email} from signing in. A reason is required.`}
                  confirmLabel="Ban"
                  destructive
                  onConfirm={async () => {
                    const reason = window.prompt('Reason for ban:')
                    if (reason) await ban.mutateAsync({ userId, reason })
                  }}
                  trigger={
                    <button className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20">
                      <Ban className="h-4 w-4" />
                      Ban
                    </button>
                  }
                />
              )}

              {/* ── Dangerous delete ── */}
              <DangerousDeleteDialog
                user={user}
                onDelete={async () => {
                  await deleteUser.mutateAsync({ userId })
                  void navigate({ to: '/users' })
                }}
                trigger={
                  <button className="flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-sm font-semibold text-destructive hover:bg-destructive/15">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                }
              />
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {[
            { label: 'Email', value: user.email ?? '—' },
            { label: 'Families', value: user.familyCount },
            { label: 'Joined', value: formatDate(user.createdAt) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-base font-semibold">{String(value)}</p>
            </div>
          ))}
        </div>

        {user.isAdmin && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Shield className="h-4 w-4" />
              This user has admin access to the portal
            </p>
          </div>
        )}

        {user.bannedAt && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Banned {formatDate(user.bannedAt)}
            </p>
            {user.banReason && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                Reason: {user.banReason}
              </p>
            )}
          </div>
        )}

        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Families</h2>
          {families.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not a member of any family.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {families.map((f) => (
                <Link
                  key={f.familyId}
                  to="/families/$familyId"
                  params={{ familyId: f.familyId }}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:text-primary"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.familyName}</p>
                    <p className="truncate text-xs capitalize text-muted-foreground">{f.plan} plan</p>
                  </div>
                  {f.role === 'owner' && (
                    <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                      <Crown className="h-3 w-3" />
                      Owner
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(f.joinedAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  )
}
