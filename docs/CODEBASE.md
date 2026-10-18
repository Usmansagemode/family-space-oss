# Family Space — Codebase Guide

A developer reference for navigating the monorepo. Not a tutorial — assumes you can read the code. This is a map so you know *where* to look.

---

## Monorepo Layout

```
family-space/
├── apps/
│   ├── web/          # Main user-facing app (TanStack Start + SSR)
│   └── mobile/       # Expo React Native app
├── packages/
│   ├── types/        # Shared TypeScript types (source of truth for all entities)
│   ├── supabase/     # All DB query functions (the data layer)
│   ├── hooks/        # Shared React hooks used by web + mobile
│   ├── utils/        # Pure utility functions (formatting, dates, recurrence)
│   └── config/       # Shared runtime config
├── docs/
│   ├── schema.sql    # Complete DB setup — single source of truth, safe to re-run on an empty DB
│   └── migrations/   # Incremental changes for existing instances
├── supabase/         # Supabase CLI config (auth, storage buckets)
├── scripts/setup.sh  # One-command instance setup
└── turbo.json        # Turborepo build pipeline
```

Workspaces are linked as `@family/types`, `@family/supabase`, `@family/hooks`, etc. Each app imports from these packages directly — no copy-pasting across apps.

---

## Packages (read these first)

### `packages/types/src/`

Every shared entity type lives here. If you want to know the shape of a `Space`, `Expense`, `FamilyMember`, etc. — start here.

| File | What it defines |
|------|----------------|
| `Family.ts` | `Family`, `FamilyMember` |
| `Space.ts` | `Space` (board columns — person/store/chore) |
| `Expense.ts` | `Expense`, expense-related pickers |
| `Item.ts` | `Item` (board cards) |
| `Budget.ts` | `Budget` |
| `Category.ts` | `Category` |
| `Income.ts` | `IncomeEntry` |
| `Tracker.ts` | `Tracker`, `TrackerEntry` |
| `Split.ts` | `SplitGroup`, `SplitParticipant`, `SplitExpense`, `SplitSettlement` |
| `RecurringTransaction.ts` | `RecurringTransaction` |
| `Activity.ts` | `ActivityLog` |

→ **Read `index.ts`** — it re-exports everything; you'll see all entities at a glance.

---

### `packages/supabase/src/`

The data access layer. Every function that touches the DB lives here. The apps never write raw Supabase queries — they import from this package.

| File | Responsibility |
|------|---------------|
| `client.ts` | `getSupabaseClient()` (anon key + user session) and `getServiceClient()` (service role, bypasses RLS — server only). Call `initSupabase()` at app startup; `initServiceClient()` only in server functions. |
| `families.ts` | Family CRUD, `findOrCreateFamily()` (called on every login), `fetchFamilyMembers()`, `removeFamilyMember()` |
| `profiles.ts` | `fetchProfile()`, `updateProfile()`, `uploadAvatar()` — avatar goes to Supabase Storage `avatars` bucket |
| `spaces.ts` | Board column CRUD, reorder, archive/restore/delete logic. `fetchArchivedPersonSpaces()` fetches soft-deleted person spaces for the restore UI. |
| `categories.ts` | Category CRUD, soft-delete, reassign-and-delete |
| `expenses.ts` | Expense CRUD, monthly and yearly fetches |
| `income.ts` | Income entry CRUD |
| `budgets.ts` | Budget upsert/delete |
| `items.ts` | Board item CRUD, completion, recurrence, drag reorder |
| `trackers.ts` | Tracker + entry CRUD |
| `splits.ts` | Full split feature: groups, participants, expenses, shares, settlements |
| `activity.ts` | `logActivity()`, `fetchActivityLog()` — the activity feed |
| `recurringTransactions.ts` | Recurring transaction templates |
| `account.ts` | `deleteUserCompletely()` — service-role deletion used by Delete account |
| `index.ts` | Re-exports everything — the public API of this package |


---

### `packages/hooks/src/`

Shared React hooks (TanStack Query wrappers) used by both `apps/web` and `apps/mobile`. These are the hooks that components actually call.

| File | What it wraps |
|------|--------------|
| `auth/useUserFamily.ts` | Fetches the family on login (creating it, or joining the caller to it) |
| `auth/useFamilyMembers.ts` | Members list for a family |
| `auth/useProfile.ts` | `useProfile()` + `useProfileMutations()` — display name + avatar |
| `family/useFamily.ts` | Family details (name, currency, locale) |
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
| `recurrence.ts` | `expandRecurringItem()` — RRULE expansion for the calendar |
| `hooks.ts` | Generic utility hooks (e.g. `useDebounce`) |

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
└── onboarding.tsx      # Owner's first-time setup
```

`routeTree.gen.ts` is auto-generated by TanStack Router — never edit it.

`router.tsx` is where the router is instantiated and the `RouterContext` (including auth) is attached.

→ **Read `__root.tsx`** to understand how auth gating works and what wraps every page.

---

### Auth Flow

```
apps/web/src/contexts/auth.tsx     # AuthProvider — user, Google and email sign-in, sign-out
apps/web/src/lib/supabase.ts       # Initializes the Supabase client (anon key)
apps/web/src/lib/google-auth.ts    # Google OAuth sign-in helper (default scopes)
apps/web/src/components/auth/LoginPage.tsx        # Sign-in page (no sign-up)
apps/web/src/routes/onboarding.tsx                # Owner's first-login setup
apps/web/src/lib/server/delete-account.ts         # Server fn: delete the caller's account
apps/web/src/lib/server/block-member.ts           # Server fn: ban a removed member's account
```

The `AuthProvider` exposes `user` (Supabase auth user). The family is fetched separately via `useUserFamily(user?.id)` — it calls `findOrCreateFamily()`, the `SECURITY DEFINER` RPC that is the only way families and memberships are created. On an empty database the caller becomes owner; otherwise they join as a member.

`__root.tsx` redirects the owner to `/onboarding` until the family's `onboarding_completed_at` is set; members never see onboarding.

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
src/entities/Item.ts                    # Client-side item transformations
src/entities/Space.ts                   # Client-side space transformations
```

Drag and drop uses `@dnd-kit/core` + `@dnd-kit/sortable`. The drag state lives in `SpaceView`.

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

The Gemini API key is stored in localStorage (not the DB) — configured in Settings → Integrations tab.

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

Tabs: **Account** (display name, avatar upload, link Google, delete account) → **Family** (name, currency, locale, Google Calendar embed URL) → **Members** (member list and remove, per-member budgets, paid-by options, archived member restore) → **Locations** (store spaces) → **Categories** (category CRUD with icon picker) → **Integrations** (Gemini API key for import).

The "Archived" section at the bottom of the Paid-by tab shows soft-deleted person spaces with a Restore button.

---

### Layout & Navigation
```
src/components/Header.tsx        # Top bar — logo, search, user menu, theme toggle
src/components/AppNav.tsx        # Left sidebar navigation
src/components/SearchDialog.tsx  # Global search (Cmd+K)
src/components/ActivitySheet.tsx # Slide-in activity feed
src/contexts/mobile-nav.tsx      # Mobile nav open/close state
```

---

### Key Lib Files
```
src/lib/utils.ts           # cn(), formatCurrency(), formatCurrencyCompact()
src/lib/date-utils.ts      # parseLocalDate() — always use this for date strings
src/lib/categoryIcons.ts   # Icon name → Lucide component mapping
src/lib/income-types.ts    # Income type labels
src/lib/config.ts          # Default onboarding categories
src/lib/exportExcel.ts     # Excel export for expenses
src/lib/recurringExpenses.ts  # Client-side logic for recurring expense generation
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
├── ExpensesScreen.tsx         # Expenses
└── CalendarScreen.tsx         # Calendar view
src/components/
├── SpaceCard.tsx / ItemCard.tsx
├── AddItemModal.tsx / EditItemModal.tsx
├── TabBar.tsx                 # Bottom tab navigation
└── SpaceIcon.tsx
src/contexts/auth.tsx          # Mobile auth context (same pattern as web)
src/lib/supabase.ts            # Mobile Supabase client init
```

Analytics, import, trackers, splits and settings are web-only.

---

## Database (`docs/schema.sql`)

Re-runnable — PART 1 drops everything, then rebuilds clean, so only run it on a database without data you need. `families_singleton` limits it to one family.

| Part | What it sets up |
|------|----------------|
| 1 | DROP everything (reverse dependency order) |
| 2 | Tables |
| 3 | Grants (which roles can access which tables) |
| 4 | `updated_at` triggers |
| 5 | New-user trigger (`handle_new_user` → creates profile row) |
| 6 | `set_item_created_by` trigger |
| 6b | Activity log triggers for items |
| 7 | RLS helper functions (`is_family_member`, `is_family_owner`, etc.) |
| 8 | RPC functions (`find_or_create_family`, `reassign_and_delete_category`) |
| 9 | Enable RLS on all tables |
| 10 | RLS policies |
| 11 | Indexes |
| 12 | Storage (avatars bucket policies) |

→ **Always update this file when making any DB change.** See CLAUDE.md for the rule.

---

## Patterns to Know

### 1. Date strings
Never `new Date("2026-01-15")` — UTC shift will give you the wrong day. Always use `parseLocalDate()` from `@family/utils`.

### 2. Soft deletes
Spaces and categories use `deleted_at` (soft delete). Expenses that referenced them show "(Unknown location)" etc. — the FKs use `ON DELETE SET NULL`. Archived person spaces can be restored via `restoreSpace()` — no data is lost on archive.

### 3. Mutations pattern
Every feature has a `use<Feature>Mutations` hook. Mutations invalidate TanStack Query cache keys on success. Never call Supabase directly from a component.

### 4. Service-role client
Only server functions (`apps/web/src/lib/server/`) use the service role, and only after verifying the caller's JWT with a user-scoped client.

### 5. Family scoping
Every table has `family_id` and RLS policies use `is_family_member(family_id)`. There is one family per deployment, but queries stay family-scoped.

---

## Where to Start Reading for Each Feature

| If you want to understand... | Start here |
|------------------------------|-----------|
| How auth works end-to-end | `apps/web/src/contexts/auth.tsx` → `__root.tsx` |
| How a user gets into the family | `packages/supabase/src/families.ts` → `findOrCreateFamily()` → `find_or_create_family()` in `docs/schema.sql` |
| How member removal works | `apps/web/src/lib/server/block-member.ts` (ban) → `removeFamilyMember()` — removes from `user_families`, unlinks person space (becomes virtual) |
| How archived members are restored | `packages/supabase/src/spaces.ts` → `restoreSpace()` + `useArchivedPersonSpaces` hook + Settings Members tab |
| How the board drag-and-drop works | `SpaceView.tsx` → `SpaceColumn.tsx` |
| How expenses are stored and fetched | `packages/supabase/src/expenses.ts` → `apps/web/src/hooks/expenses/` |
| How the import wizard works | `apps/web/src/contexts/csvImport.tsx` → `ImportWizard.tsx` |
| How recurring expenses work | `packages/supabase/src/recurringTransactions.ts` → `apps/web/src/lib/recurringExpenses.ts` |
| How split balances are calculated | `apps/web/src/lib/splitBalance.ts` |
