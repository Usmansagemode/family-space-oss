import { useState, useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  Brain,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Crown,
  Eye,
  EyeOff,
  Home,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
  User,
  UserPlus,
  UserRoundPlus,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import {
  GEMINI_MODELS,
  GEMINI_LS_KEY_API,
  GEMINI_LS_KEY_MODEL,
  getGeminiApiKey,
  getGeminiModel,
} from '#/lib/csv-import'
import { CATEGORY_ICONS, getCategoryIcon } from '#/lib/categoryIcons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { Skeleton } from '#/components/ui/skeleton'
import { Badge } from '#/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useAuthContext } from '#/contexts/auth'
import { useUserFamily } from '#/hooks/auth/useUserFamily'
import { useFamilyMembers } from '#/hooks/auth/useFamilyMembers'
import { useProfile, useProfileMutations } from '#/hooks/auth/useProfile'
import { useSpaces } from '#/hooks/spaces/useSpaces'
import { useSpaceMutations } from '#/hooks/spaces/useSpaceMutations'
import { useArchivedPersonSpaces } from '#/hooks/spaces/useArchivedPersonSpaces'
import { useCategories } from '#/hooks/categories/useCategories'
import { useAllCategories } from '#/hooks/categories/useAllCategories'
import { useCategoriesMutations } from '#/hooks/categories/useCategoriesMutations'
import { useBudgets } from '#/hooks/budgets/useBudgets'
import { useBudgetMutations } from '#/hooks/budgets/useBudgetMutations'
import { supabase } from '#/lib/supabase'
import { createInvite } from '#/lib/supabase/invites'
import { updateFamily, removeFamilyMember } from '#/lib/supabase/families'
import { archiveSpace, countSpaceExpenses } from '#/lib/supabase/spaces'
import { AddSpaceSheet } from '#/components/board/AddSpaceSheet'
import { cn, formatCurrency } from '#/lib/utils'
import { SPACE_COLORS, CHART_COLORS } from '#/lib/config'
import type { Space, Category, Budget, BudgetPeriod } from '@family/types'
import { deleteAccount } from '#/lib/server/delete-account'

export const Route = createFileRoute('/settings')({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (
      ['account', 'family', 'members', 'locations', 'categories', 'integrations'] as const
    ).includes(s.tab as 'account' | 'family' | 'members' | 'locations' | 'categories' | 'integrations')
      ? (s.tab as 'account' | 'family' | 'members' | 'locations' | 'categories' | 'integrations')
      : 'family',
  }),
  component: SettingsPage,
})

const TABS = [
  { id: 'account', label: 'Account', Icon: User },
  { id: 'family', label: 'Family', Icon: Home },
  { id: 'members', label: 'Members', Icon: Users },
  { id: 'locations', label: 'Locations', Icon: MapPin },
  { id: 'categories', label: 'Categories', Icon: Tag },
  { id: 'integrations', label: 'Integrations', Icon: Zap },
] as const

const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'PKR', 'INR', 'AED']
const LOCALES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-CA', label: 'English (CA)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-AU', label: 'English (AU)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'ur-PK', label: 'Urdu (PK)' },
]

function SettingsPage() {
  const { user } = useAuthContext()
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()

  function setTab(t: typeof tab) {
    void navigate({ search: { tab: t } })
  }

  const { data: family } = useUserFamily(user?.id)
  const familyId = family?.id ?? ''

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar (≥ md) ──────────────────────────────────────────── */}
        <nav className="hidden w-48 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border p-3 md:flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left',
                tab === t.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <t.Icon className="h-4 w-4 shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>

        {/* ── Right column: mobile tabs + content stacked ─────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile scrollable tab bar (< md) */}
          <div className="flex overflow-x-auto border-b border-border px-2 md:hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors',
                  tab === t.id
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <t.Icon className="h-3.5 w-3.5" />
                {t.label}
                {tab === t.id && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {tab === 'account' && user && (
              <AccountTab userId={user.id} />
            )}
            {tab === 'family' && family && (
              <FamilyTab family={family} userId={user?.id ?? ''} />
            )}
            {tab === 'members' && family && (
              <MembersTab familyId={familyId} currentUserId={user?.id ?? ''} currency={family.currency} locale={family.locale} />
            )}
            {tab === 'locations' && familyId && (
              <LocationsTab familyId={familyId} />
            )}
            {tab === 'categories' && familyId && (
              <CategoriesTab familyId={familyId} />
            )}
            {tab === 'integrations' && (
              <IntegrationsTab />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Family Tab ──────────────────────────────────────────────────────────────

function FamilyTab({
  family,
  userId,
}: {
  family: { id: string; name: string; currency: string; locale: string; googleCalendarId?: string; googleCalendarEmbedUrl?: string }
  userId: string
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(family.name)
  const [currency, setCurrency] = useState(family.currency)
  const [locale, setLocale] = useState(family.locale)
  const [calendarId, setCalendarId] = useState(family.googleCalendarId ?? '')
  const [embedUrl, setEmbedUrl] = useState(family.googleCalendarEmbedUrl ?? '')

  useEffect(() => {
    setName(family.name)
    setCurrency(family.currency)
    setLocale(family.locale)
    setCalendarId(family.googleCalendarId ?? '')
    setEmbedUrl(family.googleCalendarEmbedUrl ?? '')
  }, [family])

  const save = useMutation({
    mutationFn: () =>
      updateFamily(family.id, {
        name: name.trim() || 'Our Family',
        currency,
        locale,
        googleCalendarId: calendarId.trim() || undefined,
        googleCalendarEmbedUrl: embedUrl.trim() || undefined,
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['family', 'user', userId] })
      void queryClient.invalidateQueries({ queryKey: ['family', updated.id] })
      toast.success('Settings saved')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  return (
    <div className="mx-auto max-w-lg px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fam-name">Family name</Label>
          <Input
            id="fam-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Our Family"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Locale</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-sm font-medium">Google Calendar</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cal-id">Calendar ID</Label>
              <Input
                id="cal-id"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                placeholder="abc123@group.calendar.google.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cal-embed">Embed URL</Label>
              <Input
                id="cal-embed"
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/embed?src=…"
              />
            </div>
          </div>
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending} className="self-end">
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  )
}

// ─── Members Tab ─────────────────────────────────────────────────────────────

function MembersTab({
  familyId,
  currentUserId,
  currency,
  locale,
}: {
  familyId: string
  currentUserId: string
  currency?: string
  locale?: string
}) {
  const queryClient = useQueryClient()
  const { data: members, isLoading } = useFamilyMembers(familyId)
  const { data: spaces } = useSpaces(familyId)
  const { data: budgets } = useBudgets(familyId)
  const budgetMutations = useBudgetMutations(familyId)

  const [budgetEditingUserId, setBudgetEditingUserId] = useState<string | null>(null)
  const [budgetDraftAmount, setBudgetDraftAmount] = useState('')
  const [budgetDraftPeriod, setBudgetDraftPeriod] = useState<BudgetPeriod>('monthly')

  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const isOwner = members?.find((m) => m.userId === currentUserId)?.role === 'owner'

  const personSpaces = (spaces ?? []).filter((s) => s.type === 'person')

  const invite = useMutation({
    mutationFn: () => createInvite(familyId),
    onSuccess: (token) => {
      setInviteLink(`${window.location.origin}/invite?token=${token}`)
    },
    onError: () => toast.error('Failed to create invite link'),
  })

  const remove = useMutation({
    mutationFn: (userId: string) => removeFamilyMember(familyId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-members', familyId] })
      toast.success('Member removed')
    },
    onError: () => toast.error('Failed to remove member'),
  })

  function handleCopy() {
    if (!inviteLink) return
    void navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function toggleExpand(memberId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  function openBudgetEdit(userId: string, budget: Budget) {
    setBudgetEditingUserId(userId)
    setBudgetDraftAmount(String(budget.amount))
    setBudgetDraftPeriod(budget.period)
  }

  function openBudgetNew(userId: string) {
    setBudgetEditingUserId(userId)
    setBudgetDraftAmount('')
    setBudgetDraftPeriod('monthly')
  }

  function handleSaveBudget() {
    if (!budgetEditingUserId) return
    const personSpace = personSpaces.find((s) => s.linkedUserId === budgetEditingUserId)
    if (!personSpace) return
    const amount = parseFloat(budgetDraftAmount)
    if (isNaN(amount) || amount <= 0) return
    budgetMutations.upsert.mutate(
      { personId: personSpace.id, categoryId: null, amount, period: budgetDraftPeriod },
      { onSuccess: () => setBudgetEditingUserId(null) },
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-6">
        {/* Invite */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Invite a member</p>
          <p className="text-xs text-muted-foreground">
            Generate a one-time link and share it with a family member.
          </p>
          {inviteLink ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {inviteLink}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 text-muted-foreground transition hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="self-start gap-2"
              onClick={() => invite.mutate()}
              disabled={invite.isPending}
            >
              {invite.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Create invite link
            </Button>
          )}
        </div>

        {/* Member list */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            Members{members ? ` (${members.length})` : ''}
          </p>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(members ?? []).map((member) => {
                const personSpace = personSpaces.find(
                  (s) => s.linkedUserId === member.userId,
                )
                const isExpanded = expandedIds.has(member.userId)

                return (
                  <div
                    key={member.userId}
                    className="rounded-lg border border-border bg-muted/30"
                  >
                    {/* Member row */}
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      {/* Expand/collapse chevron */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(member.userId)}
                        className="shrink-0 text-muted-foreground transition hover:text-foreground"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            className="h-8 w-8 rounded-full"
                            alt=""
                            referrerPolicy="no-referrer"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium leading-none">
                          {member.name ?? member.email ?? 'Unknown'}
                          {member.userId === currentUserId && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>
                          )}
                        </span>
                        {member.name && member.email && (
                          <span className="truncate text-xs text-muted-foreground">{member.email}</span>
                        )}
                      </div>
                      {member.role === 'owner' ? (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Crown className="h-3 w-3 text-amber-500" />
                          Owner
                        </Badge>
                      ) : isOwner ? (
                        <button
                          type="button"
                          onClick={() => remove.mutate(member.userId)}
                          disabled={remove.isPending}
                          className="shrink-0 text-muted-foreground transition hover:text-destructive"
                          title="Remove member"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    {/* Expanded: budget */}
                    {isExpanded && (
                      <div className="border-t border-border px-3 pb-3 pt-2">
                        {(() => {
                          const memberBudget = (budgets ?? []).find(
                            (b) => b.personId === personSpace?.id && b.categoryId === null,
                          )
                          const isEditingBudget = budgetEditingUserId === member.userId
                          return (
                            <div className="mt-3 border-t border-border pt-3">
                              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                Spending budget
                              </p>
                              {isEditingBudget ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={budgetDraftAmount}
                                    onChange={(e) => setBudgetDraftAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="h-7 w-28 text-xs"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveBudget()
                                      if (e.key === 'Escape') setBudgetEditingUserId(null)
                                    }}
                                  />
                                  <div className="flex overflow-hidden rounded-md border border-border text-xs">
                                    <button
                                      type="button"
                                      onClick={() => setBudgetDraftPeriod('monthly')}
                                      className={cn(
                                        'px-2 py-1 transition',
                                        budgetDraftPeriod === 'monthly'
                                          ? 'bg-muted font-medium'
                                          : 'text-muted-foreground hover:text-foreground',
                                      )}
                                    >
                                      Monthly
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setBudgetDraftPeriod('yearly')}
                                      className={cn(
                                        'border-l border-border px-2 py-1 transition',
                                        budgetDraftPeriod === 'yearly'
                                          ? 'bg-muted font-medium'
                                          : 'text-muted-foreground hover:text-foreground',
                                      )}
                                    >
                                      Yearly
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleSaveBudget}
                                    disabled={budgetMutations.upsert.isPending}
                                    className="shrink-0 text-muted-foreground transition hover:text-foreground"
                                    title="Save"
                                  >
                                    {budgetMutations.upsert.isPending ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setBudgetEditingUserId(null)}
                                    className="shrink-0 text-muted-foreground transition hover:text-foreground"
                                    title="Cancel"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : memberBudget ? (
                                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                                  <Wallet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <span className="flex-1 text-xs">
                                    {formatCurrency(memberBudget.amount, currency, locale)}
                                    <span className="ml-1 text-muted-foreground">
                                      / {memberBudget.period}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openBudgetEdit(member.userId, memberBudget)}
                                    className="shrink-0 text-muted-foreground transition hover:text-foreground"
                                    title="Edit budget"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => budgetMutations.remove.mutate(memberBudget.id)}
                                    disabled={budgetMutations.remove.isPending}
                                    className="shrink-0 text-muted-foreground transition hover:text-destructive"
                                    title="Remove budget"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs"
                                  onClick={() => openBudgetNew(member.userId)}
                                >
                                  <Plus className="h-3 w-3" />
                                  Set spending budget
                                </Button>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Paid-by options ─────────────────────────────────────────────── */}
        <PaidByOptions familyId={familyId} personSpaces={personSpaces} currency={currency} locale={locale} />
      </div>
    </div>
  )
}

// ─── Paid-by options (virtual person spaces) ─────────────────────────────────

type DeleteState = { space: Space; count: number } | null

function PaidByOptions({
  familyId,
  personSpaces,
  currency,
  locale,
}: {
  familyId: string
  personSpaces: Space[]
  currency?: string
  locale?: string
}) {
  const mutations = useSpaceMutations(familyId)
  const { data: archivedSpaces } = useArchivedPersonSpaces(familyId)
  const { data: budgets } = useBudgets(familyId)
  const budgetMutations = useBudgetMutations(familyId)
  const queryClient = useQueryClient()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Space | null>(null)
  const [deleteState, setDeleteState] = useState<DeleteState>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [budgetEditingId, setBudgetEditingId] = useState<string | null>(null)
  const [budgetDraftAmount, setBudgetDraftAmount] = useState('')
  const [budgetDraftPeriod, setBudgetDraftPeriod] = useState<BudgetPeriod>('monthly')

  // Virtual = person space with no linked user
  const virtualSpaces = personSpaces.filter((s) => !s.linkedUserId)

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openBudgetEdit(spaceId: string, budget: Budget) {
    setBudgetEditingId(spaceId)
    setBudgetDraftAmount(String(budget.amount))
    setBudgetDraftPeriod(budget.period)
  }

  function openBudgetNew(spaceId: string) {
    setBudgetEditingId(spaceId)
    setBudgetDraftAmount('')
    setBudgetDraftPeriod('monthly')
  }

  function handleSaveBudget(spaceId: string) {
    const amount = parseFloat(budgetDraftAmount)
    if (isNaN(amount) || amount <= 0) return
    budgetMutations.upsert.mutate(
      { personId: spaceId, categoryId: null, amount, period: budgetDraftPeriod },
      { onSuccess: () => setBudgetEditingId(null) },
    )
  }

  function openAdd() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(space: Space) {
    setEditing(space)
    setSheetOpen(true)
  }

  async function handleDeleteClick(space: Space) {
    setDeleteLoading(true)
    try {
      const count = await countSpaceExpenses(space.id)
      setDeleteState({ space, count })
    } catch {
      toast.error('Failed to check expense references')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleArchive() {
    if (!deleteState) return
    try {
      await archiveSpace(deleteState.space.id)
      void queryClient.invalidateQueries({ queryKey: ['spaces', familyId] })
      toast.success(`${deleteState.space.name} archived`)
      setDeleteState(null)
    } catch {
      toast.error('Failed to archive')
    }
  }

  function handleHardDelete() {
    if (!deleteState) return
    mutations.remove.mutate(deleteState.space.id, {
      onSuccess: () => setDeleteState(null),
    })
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Paid-by options</p>
            <p className="text-xs text-muted-foreground">
              People who pay expenses but don't need app access.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={openAdd}
          >
            <UserRoundPlus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {virtualSpaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No extra paid-by options yet. Add one above.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {virtualSpaces.map((space) => {
              const isExpanded = expandedIds.has(space.id)
              const memberBudget = (budgets ?? []).find(
                (b) => b.personId === space.id && b.categoryId === null,
              )
              const isEditingBudget = budgetEditingId === space.id

              return (
                <div
                  key={space.id}
                  className="rounded-lg border border-border bg-muted/30"
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    {/* Expand chevron — only when show_in_expenses */}
                    {space.showInExpenses ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(space.id)}
                        className="shrink-0 text-muted-foreground transition hover:text-foreground"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      <div className="w-4 shrink-0" />
                    )}

                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: space.color }}
                    />
                    <span className="flex-1 text-sm">{space.name}</span>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Expenses</span>
                      <Switch
                        checked={space.showInExpenses}
                        onCheckedChange={(checked) => {
                          // Collapse if turning off
                          if (!checked) {
                            setExpandedIds((prev) => {
                              const next = new Set(prev)
                              next.delete(space.id)
                              return next
                            })
                            setBudgetEditingId(null)
                          }
                          mutations.toggleShowInExpenses.mutate({ id: space.id, showInExpenses: checked })
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => openEdit(space)}
                      className="shrink-0 text-muted-foreground transition hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(space)}
                      disabled={deleteLoading}
                      className="shrink-0 text-muted-foreground transition hover:text-destructive"
                      title="Delete"
                    >
                      {deleteLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Expanded: budget — only when show_in_expenses */}
                  {isExpanded && space.showInExpenses && (
                    <div className="border-t border-border px-3 pb-3 pt-2">
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Spending budget
                      </p>
                      {isEditingBudget ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={budgetDraftAmount}
                            onChange={(e) => setBudgetDraftAmount(e.target.value)}
                            placeholder="0.00"
                            className="h-7 w-28 text-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveBudget(space.id)
                              if (e.key === 'Escape') setBudgetEditingId(null)
                            }}
                          />
                          <div className="flex overflow-hidden rounded-md border border-border text-xs">
                            <button
                              type="button"
                              onClick={() => setBudgetDraftPeriod('monthly')}
                              className={cn(
                                'px-2 py-1 transition',
                                budgetDraftPeriod === 'monthly'
                                  ? 'bg-muted font-medium'
                                  : 'text-muted-foreground hover:text-foreground',
                              )}
                            >
                              Monthly
                            </button>
                            <button
                              type="button"
                              onClick={() => setBudgetDraftPeriod('yearly')}
                              className={cn(
                                'border-l border-border px-2 py-1 transition',
                                budgetDraftPeriod === 'yearly'
                                  ? 'bg-muted font-medium'
                                  : 'text-muted-foreground hover:text-foreground',
                              )}
                            >
                              Yearly
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveBudget(space.id)}
                            disabled={budgetMutations.upsert.isPending}
                            className="shrink-0 text-muted-foreground transition hover:text-foreground"
                            title="Save"
                          >
                            {budgetMutations.upsert.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setBudgetEditingId(null)}
                            className="shrink-0 text-muted-foreground transition hover:text-foreground"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : memberBudget ? (
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                          <Wallet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="flex-1 text-xs">
                            {formatCurrency(memberBudget.amount, currency, locale)}
                            <span className="ml-1 text-muted-foreground">
                              / {memberBudget.period}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => openBudgetEdit(space.id, memberBudget)}
                            className="shrink-0 text-muted-foreground transition hover:text-foreground"
                            title="Edit budget"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => budgetMutations.remove.mutate(memberBudget.id)}
                            disabled={budgetMutations.remove.isPending}
                            className="shrink-0 text-muted-foreground transition hover:text-destructive"
                            title="Remove budget"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => openBudgetNew(space.id)}
                        >
                          <Plus className="h-3 w-3" />
                          Set spending budget
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit sheet */}
      <AddSpaceSheet
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditing(null) }}
        editSpace={editing ?? undefined}
        defaultType="person"
        isPending={mutations.create.isPending || mutations.update.isPending}
        onCreate={(input) =>
          mutations.create.mutate(input, { onSuccess: () => setSheetOpen(false) })
        }
        onUpdate={(input) =>
          mutations.update.mutate(input, { onSuccess: () => setSheetOpen(false) })
        }
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteState} onOpenChange={(open) => { if (!open) setDeleteState(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove "{deleteState?.space.name}"?</DialogTitle>
          </DialogHeader>

          {deleteState?.count === 0 ? (
            <p className="text-sm text-muted-foreground">
              This person has no expenses. They'll be permanently deleted.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                This person is referenced in{' '}
                <span className="font-medium text-foreground">{deleteState?.count}</span>{' '}
                {deleteState?.count === 1 ? 'expense' : 'expenses'}.
              </p>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Archive (recommended)</p>
                <p>Hides from pickers. Old expenses still show their name.</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Delete anyway</p>
                <p>Permanently removes them. Those expenses will show "Unknown member".</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteState(null)}>
              Cancel
            </Button>
            {deleteState && deleteState.count > 0 && (
              <Button variant="outline" onClick={handleArchive}>
                Archive
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={handleHardDelete}
              disabled={mutations.remove.isPending}
            >
              {mutations.remove.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : deleteState?.count === 0 ? (
                'Delete'
              ) : (
                'Delete anyway'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archived members */}
      {archivedSpaces && archivedSpaces.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">Archived</p>
          <div className="flex flex-col gap-2">
            {archivedSpaces.map((space) => (
              <div
                key={space.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
              >
                <span className="flex-1 text-sm text-muted-foreground line-through">
                  {space.name}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => mutations.restore.mutate(space.id)}
                  disabled={mutations.restore.isPending}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Locations Tab ───────────────────────────────────────────────────────────

function LocationsTab({ familyId }: { familyId: string }) {
  const { data: spaces, isLoading } = useSpaces(familyId)
  const mutations = useSpaceMutations(familyId)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const stores = (spaces ?? []).filter((s) => s.type === 'store')

  function submitAdd() {
    if (!newName.trim()) return
    mutations.create.mutate(
      { name: newName.trim(), color: SPACE_COLORS[0], type: 'store' },
      {
        onSuccess: () => {
          setNewName('')
          setAdding(false)
        },
      },
    )
  }

  function submitEdit(space: Space) {
    if (!editName.trim()) return
    mutations.update.mutate(
      { id: space.id, name: editName.trim() },
      { onSuccess: () => setEditingId(null) },
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Store locations</p>
            <p className="text-xs text-muted-foreground">
              Toggle "Show in expenses" to make a location appear in the expense picker.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {adding && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Location name"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitAdd()
                if (e.key === 'Escape') { setAdding(false); setNewName('') }
              }}
            />
            <Button size="sm" onClick={submitAdd} disabled={mutations.create.isPending}>
              {mutations.create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName('') }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : stores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No locations yet. Add one above.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {stores.map((space) => (
              <div
                key={space.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
              >
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: space.color }}
                />
                {editingId === space.id ? (
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 flex-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitEdit(space)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => submitEdit(space)}
                  />
                ) : (
                  <span className="flex-1 text-sm">{space.name}</span>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-muted-foreground">Expenses</span>
                  <Switch
                    checked={space.showInExpenses}
                    onCheckedChange={(checked) =>
                      mutations.toggleShowInExpenses.mutate({ id: space.id, showInExpenses: checked })
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={() => { setEditingId(space.id); setEditName(space.name) }}
                  className="shrink-0 text-muted-foreground transition hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => mutations.remove.mutate(space.id)}
                  className="shrink-0 text-muted-foreground transition hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Categories Tab ──────────────────────────────────────────────────────────

const PRESET_COLORS = [...CHART_COLORS]


function CategoriesTab({ familyId }: { familyId: string }) {
  const { data: categories, isLoading } = useCategories(familyId)
  const { data: allCategories } = useAllCategories(familyId)
  const archivedCategories = (allCategories ?? []).filter((c) => c.deletedAt !== null)
  const mutations = useCategoriesMutations(familyId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]!)
  const [formIcon, setFormIcon] = useState(CATEGORY_ICONS[0]!.id)

  function openAdd() {
    setEditing(null)
    setFormName('')
    setFormColor(PRESET_COLORS[0]!)
    setFormIcon(CATEGORY_ICONS[0]!.id)
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    setFormName(cat.name)
    setFormColor(cat.color ?? PRESET_COLORS[0]!)
    setFormIcon(cat.icon ?? CATEGORY_ICONS[0]!.id)
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (!formName.trim()) return
    if (editing) {
      mutations.update.mutate(
        { id: editing.id, name: formName.trim(), color: formColor, icon: formIcon },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      mutations.create.mutate(
        { name: formName.trim(), color: formColor, icon: formIcon },
        { onSuccess: () => setDialogOpen(false) },
      )
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Expense categories</p>
            <p className="text-xs text-muted-foreground">
              Used to organize and chart your expenses.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (categories ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(categories ?? []).map((cat) => {
              const Icon = getCategoryIcon(cat.icon)
              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{ background: cat.color ?? PRESET_COLORS[0] }}
                  >
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="flex-1 text-sm">{cat.name}</span>
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    className="shrink-0 text-muted-foreground transition hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mutations.archive.mutate(cat.id)}
                    className="shrink-0 text-muted-foreground transition hover:text-destructive"
                    title="Archive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Archived categories */}
      {archivedCategories.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Archived</p>
          {archivedCategories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon)
            return (
              <div
                key={cat.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/10 px-3 py-2.5 opacity-60"
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ background: cat.color ?? PRESET_COLORS[0] }}
                >
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="flex-1 text-sm">{cat.name}</span>
                <button
                  type="button"
                  onClick={() => mutations.unarchive.mutate(cat.id)}
                  className="shrink-0 text-muted-foreground transition hover:text-foreground"
                  title="Restore"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'Add category'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {/* Preview */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ background: formColor }}
              >
                {(() => { const Icon = getCategoryIcon(formIcon); return <Icon className="h-5 w-5 text-white" /> })()}
              </div>
              <Input
                autoFocus
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Groceries"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              />
            </div>

            {/* Icon picker */}
            <div className="flex flex-col gap-1.5">
              <Label>Icon</Label>
              <div className="grid grid-cols-8 gap-1.5">
                {CATEGORY_ICONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={() => setFormIcon(id)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md border transition',
                      formIcon === id
                        ? 'border-foreground bg-muted'
                        : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="flex flex-col gap-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormColor(c)}
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition',
                      formColor === c ? 'border-foreground scale-110' : 'border-transparent',
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={mutations.create.isPending || mutations.update.isPending}
            >
              {(mutations.create.isPending || mutations.update.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {editing ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────

function IntegrationsTab() {
  const [apiKey, setApiKey] = useState(() => getGeminiApiKey())
  const [model, setModel] = useState(() => getGeminiModel())
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    localStorage.setItem(GEMINI_LS_KEY_API, apiKey.trim())
    localStorage.setItem(GEMINI_LS_KEY_MODEL, model)
    setSaved(true)
    toast.success('Integrations settings saved')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-6">
        {/* Gemini section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <p className="text-sm font-semibold">Google Gemini AI</p>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Required for AI-powered PDF bank statement import. Your API key is stored locally in
            your browser and never sent to our servers.
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gemini-api-key">API Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="gemini-api-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza…"
                  className="flex-1 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get a free API key at{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  aistudio.google.com
                </a>
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEMINI_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {apiKey.trim() && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5 shrink-0" />
              Gemini is configured — PDF import is enabled.
            </div>
          )}
        </div>

        <Button onClick={handleSave} className="self-end" disabled={saved}>
          {saved ? <Check className="h-4 w-4" /> : null}
          {saved ? 'Saved' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}

// ─── Account Tab ─────────────────────────────────────────────────────────────

function AccountTab({ userId }: { userId: string }) {
  const { data: profile, isLoading } = useProfile(userId)
  const { saveName, saveAvatar } = useProfileMutations(userId)
  const { user, providerToken, signInWithGoogle, signOut } = useAuthContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const [linkingGoogle, setLinkingGoogle] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteInFlight, setDeleteInFlight] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isGoogleLinked = user?.identities?.some((i) => i.provider === 'google') ?? false
  // Token is absent when the refresh token was revoked or the user hasn't
  // granted Calendar access yet (e.g. signed up via email then linked Google).
  const calendarConnected = isGoogleLinked && !!providerToken

  async function handleLinkGoogle() {
    if (!supabase) return
    setLinkingGoogle(true)
    const { error } = await supabase.auth.linkIdentity({ provider: 'google' })
    if (error) {
      toast.error(error.message)
      setLinkingGoogle(false)
    }
    // On success, Supabase redirects to Google — no need to reset state
  }

  function handleReconnectCalendar() {
    // Re-runs the full Google OAuth flow requesting offline access + Calendar scope.
    // This replaces the revoked/missing refresh token with a fresh one.
    signInWithGoogle()
  }

  useEffect(() => {
    if (profile?.name) setName(profile.name)
  }, [profile?.name])

  async function handleNameSave() {
    if (!name.trim()) return
    await saveName.mutateAsync(name.trim())
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await saveAvatar.mutateAsync(file)
      toast.success('Avatar updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      // reset so the same file can be re-selected if needed
      e.target.value = ''
    }
  }

  async function handleDeleteAccount() {
    if (!supabase) {
      toast.error('Authentication is unavailable. Please refresh and try again.')
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) {
      toast.error('Your session has expired. Please sign in again.')
      setDeleteOpen(false)
      return
    }

    setDeleteInFlight(true)
    setDeleteError(null)
    let deleted = false
    try {
      const result = await deleteAccount({ data: { accessToken } })
      if (!result.success) {
        if (result.code === 403) {
          setDeleteError(result.message)
          return
        }
        toast.error(result.message)
        return
      }
      deleted = true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Account deletion failed. Please try again.')
    } finally {
      setDeleteInFlight(false)
      if (deleted) {
        try { await signOut() } catch { /* ignore */ }
        // Full navigation to tear down all cached family/profile data for the deleted account.
        window.location.href = '/'
      }
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-4 sm:px-6 sm:py-6 space-y-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  const initials = (profile?.name ?? profile?.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="mx-auto max-w-lg px-4 py-4 sm:px-6 sm:py-6 space-y-8">
      {/* Avatar */}
      <div className="space-y-2">
        <Label>Profile picture</Label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={saveAvatar.isPending}
            className="relative h-20 w-20 rounded-full overflow-hidden border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-medium text-muted-foreground">
                {initials}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
              {saveAvatar.isPending ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </span>
          </button>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p>Click the image to change</p>
            <p>JPEG, PNG or WebP · max 200 KB</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Display name */}
      <div className="space-y-2">
        <Label htmlFor="display-name">Display name</Label>
        <div className="flex gap-2">
          <Input
            id="display-name"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameSaved(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleNameSave() }}
            placeholder="Your name"
            className="max-w-xs"
          />
          <Button
            onClick={() => void handleNameSave()}
            disabled={saveName.isPending || nameSaved || !name.trim()}
          >
            {saveName.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : nameSaved ? (
              <><Check className="h-4 w-4" /> Saved</>
            ) : (
              'Save'
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Shown to other members in your family space.
        </p>
      </div>

      {/* Email (read-only) */}
      <div className="space-y-2">
        <Label>Email</Label>
        <p className="text-sm text-muted-foreground">{profile?.email ?? '—'}</p>
      </div>

      {/* Linked accounts */}
      <div className="space-y-3">
        <Label>Linked accounts</Label>
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm">Google</span>
          </div>
          {isGoogleLinked ? (
            <div className="flex items-center gap-2">
              {calendarConnected ? (
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3 text-emerald-500" />
                  Calendar active
                </Badge>
              ) : (
                <Button size="sm" variant="outline" onClick={handleReconnectCalendar}>
                  Reconnect Calendar
                </Button>
              )}
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => void handleLinkGoogle()} disabled={linkingGoogle}>
              {linkingGoogle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Link'}
            </Button>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-3 rounded-lg border border-destructive/30 px-4 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">Danger Zone</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { setDeleteConfirm(''); setDeleteError(null); setDeleteOpen(true) }}
        >
          Delete account
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!deleteInFlight) setDeleteOpen(o) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, remove you from all families, and erase all your data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm" className="text-xs text-muted-foreground">
                Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => { setDeleteConfirm(e.target.value); setDeleteError(null) }}
                placeholder="DELETE"
                disabled={deleteInFlight}
                autoComplete="off"
              />
            </div>
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteInFlight}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteAccount()}
              disabled={deleteConfirm !== 'DELETE' || deleteInFlight}
            >
              {deleteInFlight ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
