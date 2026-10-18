# Family Space — Codebase Guide

A developer reference for navigating the monorepo. Not a tutorial — assumes you can read the code. This is a map so you know *where* to look.

---

## Monorepo Layout

```
family-space/
├── apps/
│   ├── web/          # Main user-facing app (TanStack Start + SSR)
│   ├── admin/        # Internal ops panel (Vite SPA)
│   └── mobile/       # Expo React Native app
├── packages/
│   ├── types/        # Shared TypeScript types (source of truth for all entities)
│   ├── supabase/     # All DB query functions (the data layer)
│   ├── hooks/        # Shared React hooks used by web + mobile
│   ├── utils/        # Pure utility functions (formatting, dates, merging)
│   ├── api/          # External API wrappers (Google Calendar)
│   └── config/       # Shared runtime config
├── docs/
│   ├── schema.sql    # Complete DB setup — single source of truth, safe to re-run
│   ├── demo-seed.sql # Seed script for marketing screenshots
│   └── demo-cleanup.sql
└── turbo.json        # Turborepo build pipeline
```

Workspaces are linked as `@family/types`, `@family/supabase`, `@family/hooks`, etc. Each app imports from these packages directly — no copy-pasting across apps.

---

## Packages (read these first)

### `packages/types/src/`

Every shared entity type lives here. If you want to know the shape of a `Space`, `Expense`, `FamilyMember`, etc. — start here.

| File | What it defines |
|------|----------------|
| `Family.ts` | `Family`, `FamilyMember`, `FamilyPlan` |
| `Space.ts` | `Space` (board columns — person/store/chore) |
| `Expense.ts` | `Expense`, expense-related pickers |
| `Item.ts` | `Item` (board cards) |
| `Budget.ts` | `Budget` |
| `Category.ts` | `Category` |
| `Income.ts` | `IncomeEntry` |
| `Tracker.ts` | `Tracker`, `TrackerEntry` |
| `Split.ts` | `SplitGroup`, `SplitParticipant`, `SplitExpense`, `SplitSettlement` |
| `Admin.ts` | `AdminFamily`, `AdminProfile`, `PlanFeature`, `FamilyFeatureOverride`, `AuditLogEntry` |
| `RecurringTransaction.ts` | `RecurringTransaction` |
| `Activity.ts` | `ActivityLog` |

→ **Read `index.ts`** — it re-exports everything; you'll see all entities at a glance.

---

### `packages/supabase/src/`

The data access layer. Every function that touches the DB lives here. The web and admin apps never write raw Supabase queries — they import from this package.

| File | Responsibility |
|------|---------------|
| `client.ts` | Two clients: `getSupabaseClient()` (anon/auth key) and `getServiceClient()` (service role, bypasses RLS — admin only). Call `initSupabase()` and `initServiceClient()` once at app startup. |
| `families.ts` | Family CRUD, `findOrCreateFamily()` (called on first login), `fetchFamilyMembers()` |
| `profiles.ts` | `fetchProfile()`, `updateProfile()`, `uploadAvatar()` — avatar goes to Supabase Storage `avatars` bucket |
| `spaces.ts` | Board column CRUD, reorder, archive/restore/delete logic. `fetchArchivedPersonSpaces()` fetches soft-deleted person spaces for the restore UI. |
| `categories.ts` | Category CRUD, soft-delete, reassign-and-delete |
| `expenses.ts` | Expense CRUD, monthly and yearly fetches |
| `income.ts` | Income entry CRUD |
| `budgets.ts` | Budget upsert/delete |
| `items.ts` | Board item CRUD, completion, recurrence, drag reorder |
| `trackers.ts` | Tracker + entry CRUD |
| `splits.ts` | Full split feature: groups, participants, expenses, shares, settlements |
| `invites.ts` | `createInvite()`, `getInviteByToken()`, `acceptInvite()` (calls the `accept_invite` RPC) |
| `activity.ts` | `logActivity()`, `fetchActivityLog()` — the activity feed |
| `recurringTransactions.ts` | Recurring transaction templates (Pro feature) |
| `admin.ts` | **All admin-panel queries** — uses `getServiceClient()` exclusively. Covers families, users, feature flags, overrides, audit log, invites. Every mutation writes to `admin_audit_log`. |
| `index.ts` | Re-exports everything — the public API of this package |

→ **Read `admin.ts`** if touching anything admin-related. Every function there calls `getServiceClient()` so RLS is bypassed.

---

### `packages/hooks/src/`

Shared React hooks (TanStack Query wrappers) used by both `apps/web` and `apps/mobile`. These are the hooks that components actually call.

| File | What it wraps |
|------|--------------|
| `auth/useUserFamily.ts` | Fetches (or creates) the user's family on login |
| `auth/useFamilyMembers.ts` | Members list for a family |
| `auth/useProfile.ts` | `useProfile()` + `useProfileMutations()` — display name + avatar |
| `family/useFamily.ts` | Family details (name, plan, currency, locale) |
| `family/usePlan.ts` | **Static** plan limits from hardcoded tiers — fast, synchronous fallback |
| `family/useDynamicPlan.ts` | **DB-backed** plan limits — fetches `plan_features` + `family_feature_overrides`, merges them. Falls back to `usePlan()` while loading. Use this in gated UI. |
| `family/useActivityFeed.ts` | Activity log for the family feed |
| `spaces/useSpaces.ts` | Active (non-deleted) board columns list |
| `spaces/useArchivedPersonSpaces.ts` | Soft-deleted person spaces — used by the restore UI in Settings |
| `spaces/useSpaceMutations.ts` | Create/update/delete/reorder/restore spaces. `restore` mutation clears `deleted_at` and invalidates both active + archived query keys. |
| `items/useItems.ts` | Board items per space |
| `items/useItemMutationsCore.ts` | Core item mutations (create, complete, delete, reorder) |
| `items/useSearchItems.ts` | Cross-space item search |

→ The web app has **local re-export shims** in `apps/web/src/hooks/*/` that just do `export { ... } from '@family/hooks'`. This means hooks added to the package are immediately available without changing the import path in web components.

---

### `packages/utils/src/`

Pure functions, no React.

| File | What's in it |
|------|-------------|
| `format.ts` | `formatCurrency()`, `formatCurrencyCompact()` — always use these, never raw `Intl` |
| `date.ts` | `parseLocalDate()` — **always use this** instead of `new Date("YYYY-MM-DD")` (UTC shift bug) |
| `color.ts` | Color helpers for OKLCH palette |
| `mergePlanLimits.ts` | Merges static plan defaults with DB `plan_features` rows and per-family overrides. Core logic for the feature-flag system. |
| `hooks.ts` | Generic utility hooks (e.g. `useDebounce`) |

---

### `packages/api/src/`

External API integrations, separate from DB concerns.

| File | What it does |
|------|-------------|
| `google-calendar.ts` | Reads/writes events to Google Calendar API |
| `calendar-sync.ts` | Syncs family board items to/from Google Calendar |

---

## Web App (`apps/web`)

### Routing

TanStack Router with **file-based routing**. Every file in `src/routes/` is a route.

```
src/routes/
├── __root.tsx          # Root layout — wraps everything, handles auth gate
├── index.tsx           # Board (/) — the main view
├── expenses/
│   ├── index.tsx       # Expense table + income
│   └── import.tsx      # CSV/PDF import wizard
├── charts.tsx          # Yearly analytics (9 charts)
├── trackers.tsx        # Debt/savings trackers
├── splits/
│   ├── index.tsx       # Split groups list
│   └── $groupId.tsx    # Individual split group detail
├── settings.tsx        # All settings tabs (Account, Family, Members, etc.)
├── import.tsx          # Alternate import entry point
├── invite.tsx          # Invite acceptance flow
├── onboarding.tsx      # First-time setup after signup
├── privacy.tsx         # Privacy policy (MDX)
└── terms.tsx           # Terms of service (MDX)
```

`routeTree.gen.ts` is auto-generated by TanStack Router — never edit it.

`router.tsx` is where the router is instantiated and the `RouterContext` (including auth) is attached.

→ **Read `__root.tsx`** to understand how auth gating works and what wraps every page.

---

### Auth Flow

```
apps/web/src/contexts/auth.tsx     # AuthProvider — holds user, session, provider tokens
apps/web/src/lib/supabase.ts       # Initializes the Supabase client (anon key)
apps/web/src/lib/google-auth.ts    # Google OAuth sign-in helper
apps/web/src/lib/server/refresh-google-token.ts  # Refreshes Google OAuth token server-side
apps/web/src/components/auth/LoginPage.tsx        # Login UI
apps/web/src/routes/onboarding.tsx                # First-login flow (create family)
```

The `AuthProvider` exposes `user` (Supabase auth user). The family is fetched separately via `useUserFamily(user?.id)` — it calls `findOrCreateFamily()` which is the only function that creates families (via a `SECURITY DEFINER` RPC).

`useBannedCheck.ts` — runs on every page load, signs the user out if `profiles.banned_at` is set.

---

### Data Flow Pattern

Every feature follows this pattern:

```
DB (Supabase)
  └── packages/supabase/src/<feature>.ts    # Raw query functions
        └── packages/hooks/src/<feature>/   # OR apps/web/src/hooks/<feature>/
              └── use<Feature>.ts           # TanStack Query: data fetching
              └── use<Feature>Mutations.ts  # TanStack Query: mutations + cache invalidation
                    └── apps/web/src/components/<feature>/
                          └── <FeatureComponent>.tsx   # UI — only talks to hooks
```

Components never import from `packages/supabase` directly. They always go through a hook.

---

### Feature Areas

#### Board (`/`)
```
src/routes/index.tsx                    # Route — assembles the board
src/components/board/SpaceView.tsx      # Full board with all columns
src/components/board/SpaceColumn.tsx    # A single column (drag target)
src/components/board/ItemCard.tsx       # A single card (drag source)
src/components/board/ItemDragOverlay.tsx
src/components/board/AddItemSheet.tsx   # Sheet for creating items
src/components/board/AddSpaceSheet.tsx  # Sheet for adding board columns
src/components/board/HistorySheet.tsx   # Completed items history
src/components/board/FocusOverlay.tsx   # Full-screen item detail
src/contexts/board.tsx                  # Board context — drag state, focus state
src/entities/Item.ts                    # Client-side item transformations
src/entities/Space.ts                   # Client-side space transformations
```

Drag and drop uses `@dnd-kit/core` + `@dnd-kit/sortable`. The drag state lives in `BoardContext`.

#### Expenses (`/expenses`)
```
src/routes/expenses/index.tsx
src/components/expenses/ExpenseTable.tsx     # TanStack Table with inline editing
src/components/expenses/ExpenseDialog.tsx    # Add/edit expense modal
src/components/expenses/IncomeDialog.tsx     # Add/edit income modal
src/components/expenses/ExpenseSummary.tsx   # Monthly totals bar
src/components/expenses/BulkEditBar.tsx      # Multi-select bulk actions
src/components/expenses/RecurringTransactionDialog.tsx  # Recurring templates
src/components/expenses/CatchUpDialog.tsx    # Generate missed recurring expenses
src/components/expenses/FocusFillMode.tsx    # Rapid keyboard-entry mode
```

#### Analytics (`/charts`)
```
src/routes/charts.tsx
src/components/charts/ChartsGrid.tsx         # Lays out all 9 charts
src/components/charts/ChartsHero.tsx         # Year total + income summary
src/components/charts/Monthly*.tsx
src/components/charts/Category*.tsx
src/components/charts/Member*.tsx
src/components/charts/Location*.tsx
src/components/charts/TopExpenses*.tsx
src/hooks/expenses/useYearlyExpenses.ts      # Fetches full year of expenses
src/hooks/useYearlyFinancials.ts             # Derived: income vs spend
```

All charts use Recharts. The filter state (year, member, category, location) is local to `charts.tsx`.

#### Import (`/expenses/import`)
```
src/routes/expenses/import.tsx
src/components/import/ImportWizard.tsx       # Multi-step wizard (Step 1–4)
src/components/import/ImportPreviewTable.tsx # Step 3: preview + edit before save
src/components/import/StandardFormatMapping.tsx  # CSV column mapping UI
src/components/import/WideFormatMapping.tsx      # "Wide" (one col per person) mapping
src/contexts/csvImport.tsx                   # Wizard state across steps
src/lib/csv-import.ts                        # Gemini AI call + CSV parsing logic
```

The import feature is Pro-gated. Gemini API key is stored in localStorage (not the DB) — configured in Settings → Integrations tab.

#### Trackers (`/trackers`)
```
src/routes/trackers.tsx
src/components/trackers/TrackerCard.tsx
src/components/trackers/CreateTrackerSheet.tsx
src/components/trackers/AddEntrySheet.tsx
```

#### Splits (`/splits`)
```
src/routes/splits/index.tsx             # Groups list
src/routes/splits/$groupId.tsx          # Group detail: expenses + balances + settle up
src/components/splits/
src/lib/splitBalance.ts                 # Balance calculation logic (read this if touching splits)
```

#### Settings (`/settings`)
```
src/routes/settings.tsx   # All tabs in one file (Account, Family, Members, Locations, Categories, Integrations)
```

Tabs: **Account** (display name + avatar upload) → **Family** (name, currency, locale, Google Calendar) → **Members** (invite link, per-member budgets, paid-by options, archived member restore) → **Locations** (store spaces) → **Categories** (category CRUD with icon picker) → **Integrations** (Gemini API key for import).

Member limit (`memberLimit`) counts all active person spaces (real + virtual). Archived spaces do not count. The "Archived" section at the bottom of the Paid-by tab shows soft-deleted person spaces with a Restore button.

---

### Layout & Navigation
```
src/components/Header.tsx        # Top bar — logo, search, user menu, theme toggle
src/components/AppNav.tsx        # Left sidebar navigation
src/components/Footer.tsx        # Marketing footer (public pages only)
src/components/SearchDialog.tsx  # Global search (Cmd+K)
src/components/ActivitySheet.tsx # Slide-in activity feed
src/components/SettingsSheet.tsx # Quick settings slide-in (mobile)
src/contexts/mobile-nav.tsx      # Mobile nav open/close state
```

---

### Billing & Plan Gating
```
packages/hooks/src/family/useDynamicPlan.ts          # The hook to use in gated UI
packages/utils/src/mergePlanLimits.ts                # Merge logic: plan defaults + DB overrides
packages/hooks/src/family/usePlan.ts                 # Static fallback
src/components/billing/UpgradePlanPrompt.tsx         # Upgrade CTA shown at gates
src/lib/server/resolvePlanLimits.ts                  # Server-side plan resolution (SSR)
docs/billing-gates.md                                # Full billing docs — read this
```

`useDynamicPlan(familyId, plan)` is the entry point. It queries `plan_features` (plan-level config) and `family_feature_overrides` (per-family exceptions), merges them, and returns a `PlanLimits` object. Admin can change these in the admin panel without a code deploy.

---

### Key Lib Files
```
src/lib/utils.ts           # cn(), formatCurrency(), formatCurrencyCompact()
src/lib/date-utils.ts      # parseLocalDate() — always use this for date strings
src/lib/categoryIcons.ts   # Icon name → Lucide component mapping
src/lib/income-types.ts    # Income type labels
src/lib/site.ts            # Site metadata (name, URL, etc.)
src/lib/config.ts          # Feature flags / runtime config
src/lib/exportExcel.ts     # Excel export for expenses (Plus/Pro)
src/lib/recurringExpenses.ts  # Client-side logic for recurring expense generation
```

---

## Admin App (`apps/admin`)

A standalone Vite SPA at a separate URL. Uses its own auth (email/password only — no Google OAuth, intentional security decision).

### Key difference from web app

The admin uses **two Supabase clients**:
- `supabase` (from `apps/admin/src/lib/supabase.ts`) — used for auth only (`signInWithPassword`, `onAuthStateChange`)
- `getServiceClient()` from `packages/supabase/src/client.ts` — used for all DB queries in `admin.ts`, bypasses RLS entirely

This split is critical. When `signInWithPassword()` is called, the Supabase client attaches the user's JWT to all requests, which would cause RLS to block admin writes. The service client is never used for auth, so it always carries the service role key.

### Routes
```
src/routes/
├── index.tsx              # Redirect to /dashboard
├── login.tsx              # Email/password login
├── dashboard.tsx          # Platform stats overview
├── families/
│   ├── index.tsx          # All families (searchable, filterable)
│   └── $familyId.tsx      # Family detail: plan, members, feature overrides
├── users/
│   ├── index.tsx          # All users
│   └── $userId.tsx        # User detail: ban/unban, promote/demote
├── billing/
│   ├── index.tsx          # Billing overview
│   └── $familyId.tsx      # Family billing detail
├── feature-flags/index.tsx  # Plan feature matrix (toggle/edit plan_features rows)
├── invites/index.tsx        # All pending invites + revoke
└── audit/index.tsx          # Admin audit log
```

### Hooks (admin-specific)
```
src/hooks/usePlatformStats.ts
src/hooks/useAdminFamilies.ts
src/hooks/useAdminUsers.ts
src/hooks/useAdminFeatureFlags.ts   # plan_features + family_feature_overrides
src/hooks/useAdminInvites.ts
src/hooks/useAdminAuditLog.ts
```

All hooks call functions from `packages/supabase/src/admin.ts`.

### Components
```
src/components/AdminLayout.tsx          # Shell with sidebar + header
src/components/AdminNav.tsx             # Left nav
src/components/AdminHeader.tsx          # Top bar
src/components/flags/PlanFlagMatrix.tsx     # Feature flag toggle grid
src/components/flags/FamilyOverrideRow.tsx  # Per-family override row
src/components/billing/PlanOverrideDialog.tsx
src/components/tables/FamilyTable.tsx
src/components/tables/UserTable.tsx
src/components/tables/InviteTable.tsx
src/components/tables/AuditTable.tsx
src/components/shared/                  # StatCard, DataTableToolbar, ConfirmDialog, etc.
```

---

## Mobile App (`apps/mobile`)

Expo + React Native + NativeWind. Shares `packages/hooks` and `packages/supabase` with the web app.

```
App.tsx                        # Root — navigation stack setup
src/screens/
├── LoginScreen.tsx            # Auth
├── SpacesScreen.tsx           # Board columns list
├── ItemsScreen.tsx            # Items within a space
├── SearchScreen.tsx           # Global item search
└── CalendarScreen.tsx         # Calendar view
src/components/
├── SpaceCard.tsx / ItemCard.tsx
├── AddItemModal.tsx / EditItemModal.tsx
├── TabBar.tsx                 # Bottom tab navigation
└── SpaceIcon.tsx
src/contexts/auth.tsx          # Mobile auth context (same pattern as web)
src/lib/supabase.ts            # Mobile Supabase client init
```

The mobile app currently covers board/items only. Expenses, trackers, and splits are web-only for now.

---

## Database (`docs/schema.sql`)

Safe to re-run in full — PART 1 drops everything, then rebuilds clean.

| Part | What it sets up |
|------|----------------|
| 1 | DROP everything (reverse dependency order) |
| 2 | Tables |
| 3 | Grants (which roles can access which tables) |
| 4 | `updated_at` triggers |
| 5 | Signup trigger (`handle_new_user` → creates profile row) |
| 6 | `set_item_created_by` trigger |
| 6b | Activity log triggers for items |
| 7 | RLS helper functions (`is_family_member`, `is_family_owner`, etc.) |
| 8 | RPC functions (`find_or_create_family`, `accept_invite`, `get_plan_limits`) |
| 9 | Enable RLS on all tables |
| 10 | RLS policies |
| 11 | Indexes |
| 12 | Storage (avatars bucket policies) |

→ **Always update this file when making any DB change.** See CLAUDE.md for the rule.

---

## Patterns to Know

### 1. Plan gating
Use `useDynamicPlan(familyId, plan)`. Never hardcode plan checks inline. Always go through `PlanLimits`. See `docs/billing-gates.md`.

### 2. Date strings
Never `new Date("2026-01-15")` — UTC shift will give you the wrong day. Always use `parseLocalDate()` from `@family/utils`.

### 3. Soft deletes
Spaces and categories use `deleted_at` (soft delete). Expenses that referenced them show "(Unknown location)" etc. — the FKs use `ON DELETE SET NULL`. Archived person spaces can be restored via `restoreSpace()` — no data is lost on archive.

### 4. Mutations pattern
Every feature has a `use<Feature>Mutations` hook. Mutations invalidate TanStack Query cache keys on success. Never call Supabase directly from a component.

### 5. Admin service client
`packages/supabase/src/admin.ts` uses `getServiceClient()`, not `getSupabaseClient()`. The service client has `persistSession: false` and `autoRefreshToken: false` — it never accumulates auth state. This is what lets it bypass RLS.

### 6. Multi-tenancy
Every table has `family_id`. RLS policies use `is_family_member(family_id)` to enforce isolation. You cannot accidentally read another family's data.

---

## Where to Start Reading for Each Feature

| If you want to understand... | Start here |
|------------------------------|-----------|
| How auth works end-to-end | `apps/web/src/contexts/auth.tsx` → `__root.tsx` |
| How a new user gets their family | `packages/supabase/src/families.ts` → `findOrCreateFamily()` |
| How member removal works | `packages/supabase/src/families.ts` → `removeFamilyMember()` — removes from `user_families`, unlinks person space (becomes virtual) |
| How archived members are restored | `packages/supabase/src/spaces.ts` → `restoreSpace()` + `useArchivedPersonSpaces` hook + Settings Members tab |
| How plan limits are enforced | `packages/hooks/src/family/useDynamicPlan.ts` → `packages/utils/src/mergePlanLimits.ts` |
| How the board drag-and-drop works | `apps/web/src/contexts/board.tsx` → `SpaceView.tsx` |
| How expenses are stored and fetched | `packages/supabase/src/expenses.ts` → `apps/web/src/hooks/expenses/` |
| How the import wizard works | `apps/web/src/contexts/csvImport.tsx` → `ImportWizard.tsx` |
| How admin writes bypass RLS | `packages/supabase/src/client.ts` → `admin.ts` |
| How feature flags flow from DB to UI | `plan_features` table → `useDynamicPlan` → `usePlan` fallback |
| How recurring expenses work | `packages/supabase/src/recurringTransactions.ts` → `apps/web/src/lib/recurringExpenses.ts` |
| How split balances are calculated | `apps/web/src/lib/splitBalance.ts` |
