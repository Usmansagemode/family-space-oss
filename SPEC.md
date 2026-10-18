# Family Space — Project Specification

> A family-first SaaS platform for shared grocery lists, chore management, and expense tracking.
> Families collaborate on a shared board, invite members via link, and get per-family data isolation.

---

## 1. Vision & Goals

**One app where a family can:**
- Manage grocery lists organized by store/location
- Assign chores by person or shared area
- Track shared finances (expenses, income, budgets, debt/savings)
- See who paid what, from which location, in which category
- Visualize income vs. spending vs. budgets

**Key principles:**
- Data belongs to a _family_, not an individual user
- Everything configurable (categories, spaces, members) lives in the DB — nothing hardcoded
- Soft deletes everywhere to protect historical data integrity
- Built for SaaS from day one (RLS, family_id on every table, indexes tuned for scale)
- Per-family currency and locale (no hardcoded USD)

---

## 2. Boilerplate & Migration Strategy

**Base:** `family-calendar` — use as monorepo scaffold
**Feature source:** `daily-expenses` — port all pages, hooks, components, lib logic

### Why family-calendar as base
- Already a Turbo monorepo (web + mobile Expo)
- TanStack Start (SSR) + TanStack Router (file-based routing) — modern, type-safe
- Auth already done: Supabase Google OAuth + invite flow
- Family isolation + RLS already architected
- shadcn/ui + MagicUI + Motion already configured

### New Supabase project
- Create a **brand new** Supabase project for family-space
- Do NOT touch the existing daily-expenses or family-calendar Supabase instances
- Run `docs/schema.sql` in the new project's SQL editor to create all tables, indexes, RLS

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | Turbo + npm workspaces |
| Web | TanStack Start (Vite, SSR) + TanStack Router (file-based) |
| Mobile | Expo (React Native + NativeWind) |
| Database | Supabase (PostgreSQL + RLS) — new project |
| Auth | Supabase: email/password + Google OAuth + identity linking |
| Styling | Tailwind CSS v4 + OKLCH colors |
| UI | shadcn/ui (new-york) + MagicUI |
| Animation | Motion (motion/react) — NOT framer-motion |
| Charts | Recharts |
| Tables | TanStack Table + TanStack Query v5 |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Forms | React Hook Form + Zod |
| AI | Google Gemini (PDF bank statement parsing) — Pro only |
| Icons | Lucide React |
| Path alias | `@/` → `src/` |

---

## 4. Core Data Model

See `docs/schema.sql` for the canonical SQL with all indexes, triggers, and RLS policies.

### 4.1 Spaces

Two types only: `'person' | 'location'`

| type | `show_in_expenses = true` | `show_in_expenses = false` |
|---|---|---|
| `person` | Appears in "Paid by" dropdown | Board column only (chore area, e.g. "Kids") |
| `location` | Appears in "Location" dropdown | Board column only (e.g. "Backyard" chore area) |

**Rule:** `show_in_expenses` is independently controllable per space, regardless of type. A "Backyard" location space with `show_in_expenses = false` functions purely as a chore column and never appears in expense pickers.

```sql
spaces (
  id, family_id, name, color (OKLCH), type ('person'|'location'),
  sort_order, show_in_expenses (bool, default true),
  assigned_person_id (location→person accountability),
  deleted_at (soft delete), created_at, updated_at
)
```

### 4.2 Categories

Per-family, DB-driven (no hardcoded defaults after seeding).

```sql
categories (id, family_id, name, color (OKLCH), icon (Lucide name),
            sort_order, deleted_at (soft delete), created_at, updated_at)
```

### 4.3 Expenses

All three foreign keys use `ON DELETE SET NULL` — deleting a category or space **never destroys expense records**.

```sql
expenses (id, family_id, amount, category_id→categories,
          location_id→spaces(type='location'),
          paid_by_id→spaces(type='person', show_in_expenses=true),
          date (DATE), description, created_at, updated_at)
```

UI fallbacks for null FKs: `"(Uncategorized)"`, `"(Unknown location)"`, `"(Unknown member)"`

### 4.4 Income

```sql
income_sources (id, family_id, person_id→spaces, name, type ('wage'|'side_gig'|'other'),
                amount, frequency ('weekly'|'biweekly'|'monthly'|'yearly'),
                start_date, end_date, created_at, updated_at)

income_entries  (id, family_id, income_source_id→income_sources, person_id→spaces,
                 amount, date (DATE), description, created_at)
```

### 4.5 Budgets

```sql
budgets (id, family_id,
         person_id→spaces (null = family-wide),
         category_id→categories (null = overall),
         amount, period ('monthly'|'yearly'), created_at, updated_at)
```

### 4.6 Items (board cards)

```sql
items (id, space_id, family_id, title, description, quantity,
       recurrence ('daily'|'weekly'|'monthly'|'yearly'),
       sort_order, start_date (TIMESTAMPTZ), end_date (TIMESTAMPTZ),
       completed, completed_at, completed_by, created_by,
       google_event_id, created_at, updated_at)
```

### 4.7 Trackers (Pro)

```sql
trackers       (id, family_id, title, description, initial_balance, current_balance, color, ...)
tracker_entries (id, tracker_id, family_id, date, description, debit, credit, balance, created_at)
```

### 4.8 Families & Auth

```sql
families       (id, name, plan ('free'|'pro'), currency, locale,
                google_calendar_id, google_calendar_embed_url, google_refresh_token, ...)
profiles       (id→auth.users, name, email, avatar_url, ...)  -- auto-created via trigger
family_members (user_id, family_id, role ('owner'|'member'), joined_at)
invites        (id, family_id, token (unique), created_by, used_at, used_by, created_at)
```

---

## 5. Deletion Edge Cases

**Rule: never silently destroy financial history.**

### Deleting a category or space (with expenses)

1. Query expense count: `SELECT COUNT(*) FROM expenses WHERE family_id = ? AND category_id = ?`
2. Show dialog:
   - **0 expenses** → hard delete immediately
   - **>0 expenses** → two options:
     - **Archive** (default/safe): sets `deleted_at`. Category/space hidden from all pickers and lists. Existing expenses retain the FK and still display the name (with an "(archived)" badge). Reversible.
     - **Reassign & Delete**: user picks a replacement. Bulk-update all N expenses to new FK, then hard delete. Irreversible.

`ON DELETE SET NULL` on expense FKs acts as a final safety net if anything bypasses the UI.

### Removing a family member

- Expenses: `paid_by_id` points to a **space**, not directly to `user_id`. The space persists after member leaves — financial history intact.
- Items: `created_by` / `completed_by` use `ON DELETE SET NULL` — items remain.
- `family_members` row is deleted. The person's space becomes "unlinked" (can be reassigned, archived, or left as-is).

---

## 6. Authentication

### Providers
- Email + Password (Supabase Auth, with email confirmation)
- Google OAuth (with optional calendar scope)

### Adding Google later
Users who sign up with email/password can link Google at any time via Settings:
```ts
supabase.auth.linkIdentity({
  provider: 'google',
  options: { scopes: 'https://www.googleapis.com/auth/calendar' }
})
```
This links the Google identity to the existing account AND retrieves the calendar `providerToken` in one step.

### Google Calendar connection
Calendar access is **always optional** and separate from auth:

| Auth method | Calendar access | Path to get it |
|---|---|---|
| Email/password | No | Settings → "Connect Google Calendar" → linkIdentity with calendar scope |
| Google (basic scopes) | No | Settings → "Connect Google Calendar" → re-auth with calendar scope |
| Google (calendar scope at signup) | Yes | `providerRefreshToken` stored in session immediately |

**One calendar per family** (not per user). Owner connects their Google Calendar; all family items with dates sync to it. `providerRefreshToken` stored in `families.google_refresh_token` for long-lived server-side sync.

---

## 7. Feature Tiers

| Feature | Free | Pro |
|---|---|---|
| Board (grocery + chore lists) | ✓ | ✓ |
| Monthly expense table (add/edit/delete) | ✓ | ✓ |
| Monthly summary (totals + category breakdown) | ✓ | ✓ |
| Income logging (sources + entries) | ✓ | ✓ |
| Budget setting (per category / per member) | ✓ | ✓ |
| Income vs expenses chart | ✓ | ✓ |
| Budget vs actual chart | ✓ | ✓ |
| Unlimited family members | ✓ | ✓ |
| CSV import | ✓ | ✓ |
| **Yearly analytics (9 charts)** | ❌ | ✓ |
| **Per-member income + budget charts** | ❌ | ✓ |
| **AI PDF import (Gemini)** | ❌ | ✓ |
| **Excel / PDF export** | ❌ | ✓ |
| **Trackers (debt / savings / loans)** | ❌ | ✓ |
| **Google Calendar sync** | ❌ | ✓ |

---

## 8. SaaS Indexes

See `docs/schema.sql` for the full index definitions. Summary:

| Table | Key index | Pattern served |
|---|---|---|
| expenses | `(family_id, date DESC)` | Monthly view |
| expenses | `(family_id, year, month)` | Yearly analytics |
| expenses | `(family_id, category_id)` | Category charts |
| expenses | `(family_id, paid_by_id)` | Member reports |
| expenses | `(family_id, location_id)` | Location reports |
| spaces | `(family_id, type, sort_order) WHERE deleted_at IS NULL` | Board columns |
| spaces | `(family_id, type, show_in_expenses) WHERE ... = true` | Expense pickers |
| categories | `(family_id, sort_order) WHERE deleted_at IS NULL` | Pickers + charts |
| items | `(space_id, sort_order) WHERE completed = false` | Board column view |
| items | `(space_id, completed_at DESC) WHERE completed = true` | History tab |
| items | `(family_id, updated_at DESC)` | Activity feed |
| tracker_entries | `(tracker_id, date DESC)` | Running balance |

---

## 9. Feature Map

### Board (from family-calendar)
- Kanban columns = spaces (person + location)
- Drag-to-reorder within and across same-type spaces
- Focus mode: full-screen single column (in-aisle use)
- Recurring items auto-advance on completion
- Google Calendar sync for dated items (Pro)

### Expenses (from daily-expenses)
- Monthly table with inline editing
- "Paid by" → person spaces with `show_in_expenses = true`
- "Location" → location spaces with `show_in_expenses = true`
- "Category" → family categories (archived hidden from picker, shown on existing expenses)
- Bulk operations; delete; CSV import

### Income & Budgets (new)
- Log income sources per person (wage, side gig, other)
- Log actual income entries
- Set monthly/yearly budgets per category and/or per person
- Charts: income vs expenses, budget vs actual

### Yearly Analytics (from daily-expenses — Pro)
- 9 interactive Recharts: monthly totals, by category, by member, by location, etc.
- Export to PDF + Excel

### Trackers (from daily-expenses — Pro)
- Debt / savings / loan cards with running balance + entry history

### Family Settings
- Rename family; set currency + locale
- Manage spaces: add/remove/reorder/rename/toggle show_in_expenses
- Manage categories: add/remove/reorder/recolor/archive
- Manage members: view, remove, transfer ownership
- Invite link: generate/regenerate shareable token
- Connect Google Calendar (Pro)

---

## 10. Monorepo Structure

```
family-space/
├── apps/
│   ├── web/                       # TanStack Start (Vite, SSR)
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── __root.tsx
│   │       │   ├── index.tsx              # Board
│   │       │   ├── expenses/
│   │       │   │   ├── index.tsx          # Monthly table
│   │       │   │   └── import.tsx         # CSV/PDF import wizard
│   │       │   ├── income.tsx             # Income sources + entries
│   │       │   ├── charts.tsx             # Yearly analytics (Pro)
│   │       │   ├── trackers.tsx           # Debt/savings/loans (Pro)
│   │       │   ├── settings.tsx           # Family settings
│   │       │   ├── invite.tsx             # Invite acceptance
│   │       │   ├── login.tsx
│   │       │   └── onboarding.tsx
│   │       ├── components/
│   │       │   ├── ui/                    # shadcn + MagicUI
│   │       │   ├── board/                 # Kanban (from family-calendar)
│   │       │   ├── expenses/              # Expense table + forms
│   │       │   ├── income/                # Income + budget forms + summary
│   │       │   ├── yearly-charts/         # 9 Recharts (Pro)
│   │       │   ├── trackers/              # Tracker cards (Pro)
│   │       │   ├── import-expenses/       # CSV/PDF import wizard
│   │       │   ├── settings/              # Space/category/member management
│   │       │   └── layout/                # Header, Sidebar, CommandPalette
│   │       ├── contexts/
│   │       │   ├── auth.tsx
│   │       │   └── family.tsx             # familyId, plan, currency, locale
│   │       ├── hooks/
│   │       │   ├── spaces/
│   │       │   ├── categories/
│   │       │   ├── expenses/
│   │       │   ├── income/
│   │       │   ├── budgets/
│   │       │   ├── trackers/
│   │       │   ├── items/
│   │       │   └── family/
│   │       └── lib/
│   │           ├── supabase.ts
│   │           ├── config.ts              # Default seed categories + OKLCH palette
│   │           ├── dateUtils.ts           # parseLocalDate() + helpers
│   │           ├── utils.ts               # cn(), formatCurrency(), formatCurrencyCompact()
│   │           └── google-calendar.ts
│   └── mobile/                    # Expo (full feature parity incl. expenses)
│
├── packages/
│   ├── types/                     # @family/types
│   ├── supabase/                  # @family/supabase — DB CRUD
│   ├── hooks/                     # @family/hooks — shared React Query hooks
│   └── utils/                     # @family/utils
│
└── docs/
    ├── SPEC.md                    # This file
    ├── schema.sql                 # Canonical SQL (run in new Supabase project)
    └── migrations/                # Future incremental migrations
```

---

## 11. Implementation Phases

### Phase 1: Foundation
- [ ] Scaffold monorepo from family-calendar
- [ ] New Supabase project; run schema.sql
- [ ] Auth: email/password + Google OAuth
- [ ] Onboarding: create family → set currency/locale → seed default categories
- [ ] Invite flow (from family-calendar)
- [ ] Family context: familyId, plan, currency, locale

### Phase 2: Board
- [ ] Port kanban from family-calendar with new schema (spaces table)
- [ ] person spaces: chore lists + "Paid by" flag
- [ ] location spaces: grocery lists + "Location" flag
- [ ] show_in_expenses toggle in space settings
- [ ] Drag & drop, focus mode, recurring items, history

### Phase 3: Expenses
- [ ] Monthly expense table (port from daily-expenses)
- [ ] Wire "Paid by" → person spaces (show_in_expenses=true)
- [ ] Wire "Location" → location spaces (show_in_expenses=true)
- [ ] Wire "Category" → DB categories
- [ ] CSV import (with fuzzy category/space name matching)
- [ ] AI PDF import — Pro only (Gemini)

### Phase 4: Income & Budgets
- [ ] Income sources + entries UI
- [ ] Budget settings (per category, per person, overall)
- [ ] Income vs expenses chart (free)
- [ ] Budget vs actual chart (free)

### Phase 5: Analytics & Trackers (Pro)
- [ ] Yearly analytics (9 charts from daily-expenses)
- [ ] Per-member income/budget breakdown charts
- [ ] Trackers (debt/savings/loans)
- [ ] Excel/PDF export

### Phase 6: Settings & Polish
- [ ] Full family settings page (spaces, categories, members)
- [ ] Deletion dialogs (Archive / Reassign & Delete)
- [ ] Pro gate components (upgrade prompts)
- [ ] Command palette (Cmd+K)
- [ ] Activity feed
- [ ] Google Calendar sync (Pro)

### Phase 7: SaaS
- [ ] Plan enforcement (Pro feature gates in UI + server)
- [ ] Stripe billing integration
- [ ] Mobile: full feature parity

---

## 12. Reference Projects

- **family-calendar:** `/Users/usmankhalid/Documents/Personal Projects/family-calendar`
  Board, spaces, items, auth, invite flow, Google Calendar sync, monorepo structure
- **daily-expenses:** `/Users/usmankhalid/Documents/Personal Projects/daily-expenses`
  Expense table, yearly charts, trackers, CSV/PDF import wizard
