import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  CheckCircle2,
  Receipt,
  ShoppingCart,
  SquareCheckBig,
  Users,
  X,
} from 'lucide-react'
import { SPACE_COLORS } from '@family/config'
import { createSpace, updateFamily as updateFamilyFn } from '@family/supabase'
import { PLAN_LIMITS } from '@family/types'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { confetti } from '#/components/ui/confetti'
import { BorderBeam } from '#/components/ui/border-beam'
import { useAuthContext } from '#/contexts/auth'
import { useUserFamily } from '#/hooks/auth/useUserFamily'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'USD', locale: 'en-US', label: 'US Dollar', symbol: '$' },
  { code: 'GBP', locale: 'en-GB', label: 'British Pound', symbol: '£' },
  { code: 'EUR', locale: 'de-DE', label: 'Euro', symbol: '€' },
  { code: 'CAD', locale: 'en-CA', label: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', locale: 'en-AU', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'PKR', locale: 'ur-PK', label: 'Pakistani Rupee', symbol: '₨' },
  { code: 'INR', locale: 'hi-IN', label: 'Indian Rupee', symbol: '₹' },
  { code: 'SAR', locale: 'ar-SA', label: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'AED', locale: 'ar-AE', label: 'UAE Dirham', symbol: 'AED' },
  { code: 'SGD', locale: 'en-SG', label: 'Singapore Dollar', symbol: 'S$' },
  { code: 'NZD', locale: 'en-NZ', label: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'JPY', locale: 'ja-JP', label: 'Japanese Yen', symbol: '¥' },
] as const

type CurrencyCode = (typeof CURRENCIES)[number]['code']

const MEMBER_PRESETS = ['Partner', 'Child', 'Parent', 'Grandparent', 'Sibling']

const STORE_PRESETS = [
  'Costco',
  'Walmart',
  'Target',
  'Amazon',
  'Whole Foods',
  'Trader Joe\'s',
  'ALDI',
  'Kroger',
  'Safeway',
  'Publix',
  'H-E-B',
  'Lidl',
]

const STEP_COUNT = 3 // welcome doesn't count; steps 1-3

// ─── Animations ───────────────────────────────────────────────────────────────

const stepVariants = {
  enter: { opacity: 0, x: 32, scale: 0.98 },
  center: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -32, scale: 0.98 },
}

const transition = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const }

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: STEP_COUNT }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i + 1 === step ? 20 : 6,
            opacity: i + 1 <= step ? 1 : 0.25,
          }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="h-1.5 rounded-full bg-primary"
        />
      ))}
    </div>
  )
}

function StepLabel({ step }: { step: number }) {
  return (
    <p className="text-xs font-medium text-muted-foreground">
      Step {step} of {STEP_COUNT}
    </p>
  )
}

function Chip({
  label,
  onRemove,
  locked,
}: {
  label: string
  onRemove?: () => void
  locked?: boolean
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium',
        locked
          ? 'border-border bg-muted text-muted-foreground'
          : 'border-border bg-secondary text-secondary-foreground',
      )}
    >
      {label}
      {!locked && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Remove ${label}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </motion.span>
  )
}

function PresetChip({
  label,
  onClick,
  selected,
}: {
  label: string
  onClick: () => void
  selected: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={selected}
      className={cn(
        'cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors',
        selected
          ? 'cursor-default border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

function InfoCallout({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-3">
      <div className="mt-0.5 shrink-0 text-primary">{icon}</div>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function StepWelcome({
  userName,
  onStart,
  onSkip,
}: {
  userName: string
  onStart: () => void
  onSkip: () => void
}) {
  return (
    <motion.div
      key="welcome"
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="flex flex-col gap-8"
    >
      {/* Heading */}
      <div className="flex flex-col gap-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-border shadow-sm">
          <img src="/family-space-logo.jpg" alt="Family Space" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Grocery lists, tasks, and expenses — all in one place for your whole family. Let's get you set up in 3 quick steps.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs font-semibold leading-tight">Grocery Lists</p>
          <p className="text-xs leading-snug text-muted-foreground">
            One column per store. Add items and check them off while you shop.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <SquareCheckBig className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs font-semibold leading-tight">Tasks</p>
          <p className="text-xs leading-snug text-muted-foreground">
            Create tasks and assign them to family members. Check them off when done.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs font-semibold leading-tight">Expenses</p>
          <p className="text-xs leading-snug text-muted-foreground">
            Log shared spending. See who paid, where it was spent, and how much.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button onClick={onStart} className="w-full" size="lg">
          Let's get started
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="cursor-pointer py-1 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip setup, take me straight in
        </button>
      </div>
    </motion.div>
  )
}

function StepFamilyName({
  familyName,
  onFamilyNameChange,
  currency,
  onCurrencyChange,
  onNext,
}: {
  familyName: string
  onFamilyNameChange: (v: string) => void
  currency: CurrencyCode
  onCurrencyChange: (v: CurrencyCode) => void
  onNext: () => void
}) {
  return (
    <motion.div
      key="step1"
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1">
        <StepLabel step={1} />
        <h2 className="text-xl font-bold">What's your family called?</h2>
        <p className="text-sm text-muted-foreground">
          This name appears at the top of your shared board. You can always change it later in Settings.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="family-name">Family name</Label>
          <Input
            id="family-name"
            value={familyName}
            onChange={(e) => onFamilyNameChange(e.target.value)}
            placeholder="e.g. The Johnsons"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && familyName.trim() && onNext()}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency">Currency</Label>
          <p className="text-xs text-muted-foreground">Used to format amounts across expenses and charts.</p>
          <Select
            value={currency}
            onValueChange={(v) => onCurrencyChange(v as CurrencyCode)}
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} — {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={!familyName.trim()}
        className="w-full"
        size="lg"
      >
        Next
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </motion.div>
  )
}

function StepMembers({
  userDisplayName,
  members,
  membersLimit,
  onAdd,
  onRemove,
  onNext,
}: {
  userDisplayName: string
  members: string[]
  membersLimit: number | null // null = unlimited (Pro)
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  onNext: () => void
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // User themselves count as 1 toward the limit
  const totalCount = members.length + 1
  const atLimit = membersLimit !== null && totalCount >= membersLimit

  const addMember = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || members.includes(trimmed) || atLimit) return
    onAdd(trimmed)
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <motion.div
      key="step2"
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1">
        <StepLabel step={2} />
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">Who's in your family?</h2>
          {membersLimit !== null && (
            <span className={cn(
              'shrink-0 text-xs font-medium tabular-nums',
              atLimit ? 'text-destructive' : 'text-muted-foreground',
            )}>
              {totalCount} / {membersLimit}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Add everyone you share a home and budget with. You're already included — just add the rest.
        </p>
      </div>

      {/* Chips */}
      <div className="flex min-h-[52px] flex-wrap gap-2">
        <AnimatePresence>
          <Chip key="__you" label={userDisplayName || 'You'} locked />
          {members.map((m) => (
            <Chip key={m} label={m} onRemove={() => onRemove(m)} />
          ))}
        </AnimatePresence>
      </div>

      {/* At-limit notice */}
      {atLimit && (
        <p className="text-sm text-muted-foreground">
          You've reached the <span className="font-medium text-foreground">{membersLimit}-member limit</span> on your current plan. You can add more after upgrading — or remove someone above to swap them out.
        </p>
      )}

      {/* Input — hidden when at limit */}
      {!atLimit && (
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addMember(input)
              }
            }}
            placeholder="Type a name and press Enter…"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addMember(input)}
            disabled={!input.trim()}
            className="shrink-0"
          >
            Add
          </Button>
        </div>
      )}

      {/* Quick presets — hide already-selected and hide entirely when at limit */}
      {!atLimit && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Quick add</p>
          <div className="flex flex-wrap gap-2">
            {MEMBER_PRESETS.map((preset) => (
              <PresetChip
                key={preset}
                label={preset}
                selected={members.includes(preset)}
                onClick={() => addMember(preset)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Expense callout */}
      <InfoCallout icon={<Receipt className="h-4 w-4" />}>
        Each person you add shows up in two places: as{' '}
        <span className="font-medium text-foreground">"Paid By"</span> when logging an expense
        (so you know who covered the bill), and as their own column on the{' '}
        <span className="font-medium text-foreground">Tasks</span> board where you can assign and track their to-dos.
      </InfoCallout>

      <Button onClick={onNext} className="w-full" size="lg">
        Next
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </motion.div>
  )
}

function StepStores({
  stores,
  onAdd,
  onRemove,
  onFinish,
  saving,
}: {
  stores: string[]
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  onFinish: () => void
  saving: boolean
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addStore = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || stores.includes(trimmed)) return
    onAdd(trimmed)
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <motion.div
      key="step3"
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1">
        <StepLabel step={3} />
        <h2 className="text-xl font-bold">Where does your family shop?</h2>
        <p className="text-sm text-muted-foreground">
          Pick from the list or type your own. Each store gets its own grocery list column — add items to it, then check them off while you shop.
        </p>
      </div>

      {/* Selected chips */}
      {stores.length > 0 && (
        <div className="flex min-h-[36px] flex-wrap gap-2">
          <AnimatePresence>
            {stores.map((s) => (
              <Chip key={s} label={s} onRemove={() => onRemove(s)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Preset chips */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Popular stores</p>
        <div className="flex flex-wrap gap-2">
          {STORE_PRESETS.map((preset) => (
            <PresetChip
              key={preset}
              label={preset}
              selected={stores.includes(preset)}
              onClick={() => addStore(preset)}
            />
          ))}
        </div>
      </div>

      {/* Custom input */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addStore(input)
            }
          }}
          placeholder="Other store…"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => addStore(input)}
          disabled={!input.trim()}
          className="shrink-0"
        >
          Add
        </Button>
      </div>

      {/* Expense callout */}
      <InfoCallout icon={<ShoppingCart className="h-4 w-4" />}>
        Stores also appear as{' '}
        <span className="font-medium text-foreground">"Location"</span> when you log an expense —
        so your spending report shows exactly where your money went, not just how much.
      </InfoCallout>

      <Button
        onClick={onFinish}
        disabled={saving}
        className="w-full"
        size="lg"
      >
        {saving ? 'Setting up…' : 'Finish setup'}
        {!saving && <ArrowRight className="ml-1.5 h-4 w-4" />}
      </Button>
    </motion.div>
  )
}

function StepDone({
  familyName,
  members,
  stores,
  onEnter,
}: {
  familyName: string
  members: string[]
  stores: string[]
  onEnter: () => void
}) {
  // Pick a representative store + member for the expense preview
  const previewStore = stores[0] ?? 'Costco'
  const previewMember = members[0] ?? 'You'

  return (
    <motion.div
      key="done"
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="flex flex-col gap-6 text-center"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">You're all set!</h2>
        <p className="text-sm text-muted-foreground">
          Your family space is ready. Here's a quick look at what was just created.
        </p>
      </div>

      {/* Summary */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left">
        <SummaryRow
          icon={<Users className="h-3.5 w-3.5" />}
          label={familyName}
          sub="Your family workspace"
        />
        {members.length > 0 && (
          <SummaryRow
            icon={<Users className="h-3.5 w-3.5" />}
            label={`${members.length + 1} member${members.length + 1 > 1 ? 's' : ''} — available as Paid By & Tasks columns`}
            sub={members.slice(0, 3).join(', ') + (members.length > 3 ? '…' : '')}
          />
        )}
        {stores.length > 0 && (
          <SummaryRow
            icon={<ShoppingCart className="h-3.5 w-3.5" />}
            label={`${stores.length} store${stores.length > 1 ? 's' : ''} — grocery list columns & expense locations`}
            sub={stores.slice(0, 3).join(', ') + (stores.length > 3 ? '…' : '')}
          />
        )}
      </div>

      {/* Expense preview — ties it all together */}
      {stores.length > 0 && (
        <div className="flex flex-col gap-2 text-left">
          <p className="text-xs font-medium text-muted-foreground">
            Here's what an expense will look like:
          </p>
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
            <BorderBeam size={120} duration={8} colorFrom="oklch(0.7 0.15 250)" colorTo="transparent" />
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <p className="text-base font-semibold">$45.80</p>
                <p className="text-xs text-muted-foreground">Groceries</p>
              </div>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Today
              </span>
            </div>
            <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                {previewStore}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Paid by {previewMember}
              </span>
            </div>
          </div>
        </div>
      )}

      <Button onClick={onEnter} className="w-full" size="lg">
        Open Family Space
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </motion.div>
  )
}

function SummaryRow({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode
  label: string
  sub: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
      <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-primary" />
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3 | 4

function OnboardingWizard({
  userId,
  userDisplayName,
}: {
  userId: string
  userDisplayName: string
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: family } = useUserFamily(userId)

  const [step, setStep] = useState<Step>(0)
  const [familyName, setFamilyName] = useState('Our Family')
  const [currency, setCurrency] = useState<CurrencyCode>('USD')
  const [members, setMembers] = useState<string[]>([])
  const [stores, setStores] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Sync initial values from loaded family
  useEffect(() => {
    if (family) {
      setFamilyName(family.name)
      setCurrency((family.currency as CurrencyCode) ?? 'USD')
    }
  }, [family?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fire confetti when reaching the done screen
  useEffect(() => {
    if (step === 4) {
      const t = setTimeout(() => {
        confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0, y: 0.6 } })
        confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.6 } })
      }, 200)
      return () => clearTimeout(t)
    }
  }, [step])

  const markComplete = async () => {
    if (!family) return
    await updateFamilyFn(family.id, {
      name: familyName,
      currency,
      locale: CURRENCIES.find((c) => c.code === currency)?.locale ?? 'en-US',
      onboardingCompletedAt: new Date(),
    })
    // Update cache immediately so the redirect guard in __root.tsx doesn't
    // bounce the user back to /onboarding after they click "Open Family Space"
    queryClient.setQueryData(['family', 'user', userId], {
      ...family,
      name: familyName,
      currency,
      onboardingCompletedAt: new Date(),
    })
  }

  const handleSkip = async () => {
    if (!family) return
    setSaving(true)
    try {
      await markComplete()
    } finally {
      setSaving(false)
    }
    void navigate({ to: '/' })
  }

  const handleFinish = async () => {
    if (!family) return
    setSaving(true)
    try {
      // 1. Persist family name, currency, onboarding complete flag
      await markComplete()

      // 2. Create person spaces (virtual family members)
      for (let i = 0; i < members.length; i++) {
        await createSpace({
          familyId: family.id,
          name: members[i],
          color: SPACE_COLORS[i % SPACE_COLORS.length],
          type: 'person',
        })
      }

      // 3. Create store spaces (grocery board columns)
      for (let i = 0; i < stores.length; i++) {
        await createSpace({
          familyId: family.id,
          name: stores[i],
          color: SPACE_COLORS[(i + 5) % SPACE_COLORS.length],
          type: 'store',
        })
      }

      // 4. Warm the spaces cache so the board loads instantly
      await queryClient.invalidateQueries({ queryKey: ['spaces', family.id] })

      setStep(4)
    } catch {
      setSaving(false)
    }
    setSaving(false)
  }

  const addMember = (name: string) => setMembers((prev) => [...prev, name])
  const removeMember = (name: string) =>
    setMembers((prev) => prev.filter((m) => m !== name))
  const addStore = (name: string) => setStores((prev) => [...prev, name])
  const removeStore = (name: string) =>
    setStores((prev) => prev.filter((s) => s !== name))

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 py-12 sm:p-8">
      <div className="w-full max-w-md sm:max-w-xl">
        {/* Progress — shown on steps 1-3 only */}
        <AnimatePresence mode="wait">
          {step >= 1 && step <= 3 && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={transition}
              className="mb-6 flex items-center justify-between"
            >
              <ProgressDots step={step} />
              <button
                type="button"
                onClick={handleSkip}
                disabled={saving}
                className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Skip setup
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepWelcome
                userName={userDisplayName}
                onStart={() => setStep(1)}
                onSkip={handleSkip}
              />
            )}
            {step === 1 && (
              <StepFamilyName
                familyName={familyName}
                onFamilyNameChange={setFamilyName}
                currency={currency}
                onCurrencyChange={setCurrency}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <StepMembers
                userDisplayName={userDisplayName}
                members={members}
                membersLimit={family ? PLAN_LIMITS[family.plan].membersLimit : 3}
                onAdd={addMember}
                onRemove={removeMember}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <StepStores
                stores={stores}
                onAdd={addStore}
                onRemove={removeStore}
                onFinish={handleFinish}
                saving={saving}
              />
            )}
            {step === 4 && (
              <StepDone
                familyName={familyName}
                members={members}
                stores={stores}
                onEnter={() => void navigate({ to: '/' })}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function OnboardingPage() {
  const { user, loading } = useAuthContext()
  const { data: family } = useUserFamily(user?.id)
  const navigate = useNavigate()

  // If onboarding is already done (existing user), go home
  useEffect(() => {
    if (!loading && user && family?.onboardingCompletedAt) {
      void navigate({ to: '/' })
    }
  }, [loading, user, family, navigate])

  if (loading || !user || !family) return null

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    ''

  return <OnboardingWizard userId={user.id} userDisplayName={displayName} />
}
