import { useState } from 'react'
import {
  LayoutGrid,
  Receipt,
  RefreshCw,
  Check,
  Sparkles,
  ImageIcon,
  ShoppingCart,
  TrendingUp,
  ArrowDownLeft,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { useAuthContext } from '#/contexts/auth'
import Footer from '#/components/Footer'

// ── Google SVG ────────────────────────────────────────────────────────────────

const GOOGLE_SVG = (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

// ── Screenshot placeholder ────────────────────────────────────────────────────

function ScreenshotSlot({
  label,
  tag,
  className = '',
}: {
  label: string
  tag?: string
  className?: string
}) {
  return (
    <div
      className={`relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40 ${className}`}
    >
      {tag && (
        <span className="absolute right-3 top-3 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border backdrop-blur-sm">
          {tag}
        </span>
      )}
      <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
        <ImageIcon className="h-8 w-8" />
        <span className="px-4 text-center text-xs leading-relaxed">
          {label}
        </span>
      </div>
    </div>
  )
}

// ── Email auth form ───────────────────────────────────────────────────────────

function EmailAuthForm() {
  const { signInWithEmail, signUpWithEmail } = useAuthContext()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const err =
      mode === 'signin'
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password)

    setLoading(false)
    if (err) {
      setError(err)
    } else if (mode === 'signup') {
      setMessage('Check your email to confirm your account.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 w-full max-w-sm space-y-3">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? 'Please wait…'
          : mode === 'signin'
            ? 'Sign in'
            : 'Create account'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {mode === 'signin' ? (
          <>
            No account?{' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => {
                setMode('signup')
                setError(null)
                setMessage(null)
              }}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => {
                setMode('signin')
                setError(null)
                setMessage(null)
              }}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  )
}

// ── Quick-feature bento cards ─────────────────────────────────────────────────

const QUICK_FEATURES = [
  {
    icon: <Receipt className="h-5 w-5" />,
    title: 'Track every expense',
    body: 'Log who paid, where, and what for. Categories, store locations, and per-member totals — all in one view.',
  },
  {
    icon: <ArrowDownLeft className="h-5 w-5" />,
    title: 'See total family income',
    body: 'Record salaries, freelance, and rental income per person. Net cash flow at a glance, every month.',
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    title: 'Set it once, runs forever',
    body: 'Recurring rent, subscriptions, and paycheques log themselves every cycle — income and expenses both.',
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: '9 charts. A full year.',
    body: 'Monthly trends, category breakdowns, member comparisons, and a 12-month heatmap. No guesswork.',
  },
  {
    icon: <ShoppingCart className="h-5 w-5" />,
    title: 'One list per store',
    body: 'Separate columns for Walmart, Costco, anywhere. Shared in real time. Add from history in one tap.',
  },
  {
    icon: <LayoutGrid className="h-5 w-5" />,
    title: 'Assign it. Date it. Done.',
    body: 'Drag-and-drop chores per person. Dated items sync straight to Google Calendar automatically.',
  },
]

// ── Deep-dive feature rows ────────────────────────────────────────────────────

const FEATURE_ROWS = [
  {
    badge: null,
    eyebrow: 'Finances',
    title: 'Know exactly where your money goes.',
    body: 'Stop wondering who paid what and when. Every expense and income entry lives in one clean view — with a monthly chart that shows income vs spending before you even have to ask.',
    bullets: [
      'Per-member totals with month-over-month comparison',
      'Custom categories and store locations per family',
      'Bulk edit, Quick Tag, and duplicate detection built in',
    ],
    screenshotSrc: '/screenshots/expenses-desktop.png',
    screenshotAlt:
      'Family Space finances page showing income vs expense chart, per-member summary cards, and expense table with category badges',
    screenshotLabel:
      'screenshot: finances page — FinancialsChart (income vs expense bars) at top, ExpenseSummary cards per member below, expense table with category badges. Light mode.',
    screenshotTag: 'Finances',
  },
  {
    badge: null,
    eyebrow: 'Income & recurring',
    title: 'Set it once. It runs itself.',
    body: 'Log salaries, freelance, and rental income per person. Then set up recurring transactions — rent, subscriptions, paycheques — and they appear automatically every cycle, income included.',
    bullets: [
      'Income types: Salary, Freelance, Rental, Business, and more',
      'Recurring income and expenses — weekly, monthly, or yearly',
      'Missed entries caught up automatically, no back-filling needed',
    ],
    screenshotSrc: '/screenshots/income-recurring-desktop.png',
    screenshotAlt:
      'Family Space income tab showing total income card and list of income entries with type icons and person names',
    screenshotLabel:
      'screenshot: finances page income tab — total income card in green at top, list of income entries with type icons and person names. Light mode.',
    screenshotTag: 'Income & Recurring',
  },
  {
    badge: null,
    eyebrow: 'Yearly analytics',
    title: 'Your year in spending, visualised.',
    body: '9 interactive charts break down every dollar by month, category, member, and store. Filter by anything — then export a PDF or Excel report in one click.',
    bullets: [
      'Monthly trend, category donut, and member comparison',
      'Category heatmap across all 12 months',
      'Export to PDF or Excel with one click (Plus+)',
    ],
    screenshotSrc: '/screenshots/analytics-desktop.png',
    screenshotAlt:
      'Family Space analytics page showing year selector, total spend, and multiple charts including bar chart, donut, and heatmap',
    screenshotLabel:
      'screenshot: analytics page — year selector, total spend in bold, 3–4 charts side by side (bar chart, donut, heatmap), export button visible. Light mode.',
    screenshotTag: 'Analytics',
  },
  {
    badge: null,
    eyebrow: 'Shared board',
    title: 'Your whole family, organized.',
    body: 'A column per person, a column per store. Grocery runs, chores, errands — drag, drop, check off. Separate tabs keep shopping and tasks from mixing. Dated items sync to Google Calendar.',
    bullets: [
      'Separate Lists and Chores tabs — no more mixed-up boards',
      'Dated items sync straight to Google Calendar',
      'Search across all items across all columns instantly',
    ],
    screenshotSrc: '/screenshots/board-desktop.png',
    screenshotAlt:
      'Family Space board view with store columns showing grocery items with checkboxes and dates',
    screenshotLabel:
      'screenshot: board view with 3–4 store columns (Walmart, Costco, T&T) — items with checkboxes and dates, dark mode.',
    screenshotTag: 'Board',
  },
  {
    badge: 'Pro',
    eyebrow: 'AI bank import',
    title: 'Upload a statement. Done in seconds.',
    body: 'Drop in a PDF bank statement and Gemini AI pulls every transaction automatically. Review the mapped columns, fix anything, and import a full month in one go — no spreadsheet needed.',
    bullets: [
      'Supports standard and wide-format bank exports',
      'AI maps columns to your categories automatically',
      'Review and edit every row before importing anything',
    ],
    screenshotSrc: '/screenshots/ai-import-desktop.png',
    screenshotAlt:
      'Family Space AI import wizard showing extracted transactions with category mapping dropdowns and editable rows',
    screenshotLabel:
      'screenshot: AI import wizard step 2 or 3 — extracted transactions with category mapping dropdowns, some rows highlighted/edited. Light mode.',
    screenshotTag: 'AI Import',
  },
]

// ── Pricing ───────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything a small family needs — free, forever.',
    popular: false,
    cta: 'Get started free',
    features: [
      'Shared grocery & chores board',
      'Expense & income tracking',
      'Recurring transactions',
      'Up to 3 family members',
      'Google Calendar sync',
    ],
  },
  {
    name: 'Plus',
    price: '$5',
    period: 'per month',
    description: 'Deeper insight for families who want to save more.',
    popular: true,
    cta: 'Start with Plus',
    features: [
      'Everything in Free',
      'Up to 5 family members',
      'Yearly analytics (9 charts)',
      'Export to PDF & Excel',
      'Monthly budget tracking',
    ],
  },
  {
    name: 'Pro',
    price: '$10',
    period: 'per month',
    description: 'Unlimited everything — powered by AI.',
    popular: false,
    cta: 'Start with Pro',
    features: [
      'Everything in Plus',
      'Unlimited family members',
      'AI PDF bank statement import',
      'Split expenses between members',
      'Priority support',
    ],
  },
]

// ── Stats ─────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '$0', label: 'to start, forever' },
  { value: '< 1 min', label: 'to set up' },
  { value: '9 charts', label: 'of yearly analytics' },
  { value: 'AI import', label: 'on Pro — PDF to entries' },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export function LoginPage() {
  const { signInWithGoogle } = useAuthContext()

  return (
    <div className="h-full overflow-y-auto">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="mx-auto flex max-w-2xl flex-col items-center px-6 pb-16 pt-20 text-center sm:pt-28">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Free to start · No credit card needed
        </span>

        <h1 className="text-4xl font-bold tracking-tight sm:text-[3.25rem] sm:leading-[1.12]">
          One app for your whole family.{' '}
          <span className="text-muted-foreground">
            Finances, lists & chores.
          </span>
        </h1>

        <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
          Ditch the spreadsheets and group chats. Family Space brings shared
          expense tracking, income logging, grocery lists by store, a chore
          board, and yearly analytics into one place — synced for everyone.
        </p>

        <Button
          size="lg"
          onClick={signInWithGoogle}
          className="mt-8 gap-3 px-7 py-6 text-base cursor-pointer"
        >
          {GOOGLE_SVG}
          Continue with Google
        </Button>

        <div className="mt-6 flex w-full max-w-sm items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">
            or sign in with email
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <EmailAuthForm />
      </section>

      {/* ── Hero screenshot ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-2xl border border-border shadow-xl ring-1 ring-border/50 overflow-hidden">
          <img
            src="/screenshots/hero-finances.png"
            alt="Family Space finances page showing monthly income vs expense chart, per-member summary cards, and expense table"
            className="w-full aspect-video sm:aspect-21/9 object-cover object-top"
            loading="lazy"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Income vs. expenses, monthly
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <Receipt className="h-3 w-3" />
            Per-member totals & category tags
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            Recurring transactions, automated
          </span>
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <section className="border-y border-border px-6 py-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-around gap-8 text-center sm:flex-row sm:gap-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick features bento ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Not just a finance app. Not just a to-do list.
          </h2>
          <p className="mt-2 text-muted-foreground">
            Everything your family tracks — all in one place, always in sync.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-muted/30 p-5 transition-colors duration-200 hover:bg-muted/60 cursor-default"
            >
              <div className="mb-3 inline-flex items-center justify-center rounded-lg border border-border bg-background p-2 text-foreground">
                {f.icon}
              </div>
              <h3 className="mb-1 font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature deep-dive rows ────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/10 px-6 py-24">
        <div className="mx-auto max-w-5xl space-y-28">
          {FEATURE_ROWS.map((f, i) => {
            const textFirst = i % 2 === 0
            return (
              <div
                key={f.title}
                className="grid items-center gap-10 md:grid-cols-2"
              >
                {/* Text */}
                <div className={textFirst ? 'md:order-1' : 'md:order-2'}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {f.eyebrow}
                    </span>
                    {f.badge && (
                      <Badge
                        variant="secondary"
                        className="gap-1 text-[10px] uppercase tracking-wide"
                      >
                        <Sparkles className="h-3 w-3" />
                        {f.badge}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {f.title}
                  </h2>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-muted-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Screenshot */}
                <div className={textFirst ? 'md:order-2' : 'md:order-1'}>
                  {f.screenshotSrc ? (
                    <div className="rounded-2xl border border-border shadow-lg ring-1 ring-border/40 overflow-hidden">
                      <img
                        src={f.screenshotSrc}
                        alt={f.screenshotAlt}
                        className="w-full"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <ScreenshotSlot
                      label={f.screenshotLabel}
                      tag={f.screenshotTag}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Simple, honest pricing
            </h2>
            <p className="mt-2 text-muted-foreground">
              Start free. Upgrade only when you need more.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 transition-shadow duration-200 ${
                  plan.popular
                    ? 'border-foreground/30 bg-background shadow-lg hover:shadow-xl'
                    : 'border-border bg-background/60 hover:shadow-md'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background px-3 py-0.5 text-xs font-semibold">
                    Most popular
                  </span>
                )}

                <div className="mb-6">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {plan.name}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {plan.period}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-muted-foreground">{feat}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? 'default' : 'outline'}
                  className="w-full cursor-pointer"
                  onClick={signInWithGoogle}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            All plans include a 7-day free trial of paid features. Cancel
            anytime.
          </p>
        </div>
      </section>

      {/* ── Mobile screenshots strip ──────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/10 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              Your family, right in your pocket.
            </h2>
            <p className="mt-2 text-muted-foreground">
              Log an expense at checkout. Check off groceries in the aisle.
              Assign chores from anywhere.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-border shadow-md ring-1 ring-border/40 overflow-hidden">
              <img
                src="/screenshots/mobile-board.png"
                alt="Family Space board view on mobile showing grocery list columns with checkboxes and bottom navigation"
                className="w-full aspect-9/16 object-cover object-top"
                loading="lazy"
              />
            </div>
            <div className="rounded-2xl border border-border shadow-md ring-1 ring-border/40 overflow-hidden">
              <img
                src="/screenshots/mobile-finances.png"
                alt="Family Space finances page on mobile showing income vs expense chart and expense rows"
                className="w-full aspect-9/16 object-cover object-top"
                loading="lazy"
              />
            </div>
            <div className="rounded-2xl border border-border shadow-md ring-1 ring-border/40 overflow-hidden">
              <img
                src="/screenshots/mobile-analytics.png"
                alt="Family Space analytics page on mobile showing year selector, total spend, and charts"
                className="w-full aspect-9/16 object-cover object-top"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-24">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your family's everything,{' '}
            <span className="text-muted-foreground">in one place.</span>
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Free to start. Takes less than a minute to set up.
          </p>
          <Button
            size="lg"
            onClick={signInWithGoogle}
            className="mt-8 gap-3 px-7 py-6 text-base cursor-pointer"
          >
            {GOOGLE_SVG}
            Get started free
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            No credit card required.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
