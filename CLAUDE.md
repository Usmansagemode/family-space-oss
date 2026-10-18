# Family Space

SaaS platform for families: grocery lists, chore management, and expense tracking — all in one place.

## Development Workflow (mandatory for every task)

Every feature task follows this exact sequence — no exceptions:

1. **Read the GitHub issue** — fetch the issue body (not just the title; titles are mismatched on this repo). Confirm files, acceptance criteria, and implementation notes before writing any code.
2. **Plan** — state what you're going to do in one short paragraph. Don't start writing files until the plan is clear.
3. **Execute with Sonnet** — implement the task using the current model.
4. **Run the reviewer** — spawn `fullstack-code-reviewer` agent with model `opus`. Pass it the full context: what changed, why, and what to check. Wait for the report.
5. **Fix all criticals** from the review before committing. Document skipped suggestions and why.
6. **Commit and push** — stage only the files for this task. Commit message must:
   - Reference the GitHub issue number (`closes #N` or `refs #N`)
   - No `Co-Authored-By` trailer — author is `Usmansagemode` only

## Reference Projects

- **family-calendar** (`/Users/usmankhalid/Documents/Personal Projects/family-calendar`)
  — Boilerplate source. Board, spaces, items, drag & drop, invite flow, Google Calendar sync, monorepo structure, Supabase auth.
- **daily-expenses** (`/Users/usmankhalid/Documents/Personal Projects/daily-expenses`)
  — Feature source. Expense table, yearly analytics (9 charts), trackers, CSV/PDF import wizard (Gemini AI).

## Billing & Pricing

See `docs/billing-gates.md` for:
- Plan tiers (Free / Plus $5 / Pro $10) and feature gates
- How `usePlan()` hook works and where each gate lives
- Step-by-step Stripe setup (when ready to go live)
- How to test plans locally without Stripe

## Schema Changes

Two files must always be kept in sync for every database change:

### 1. `docs/schema.sql` — fresh install reference
The complete database definition. Safe to re-run (drops and rebuilds everything).
Used for: local dev setup, new environments, disaster recovery.
**Never run on production** — it drops all tables.

Always update `schema.sql` when making any database change:
- New tables or columns
- Modified column types, defaults, or constraints
- New or changed RLS policies
- New or changed triggers or functions
- New indexes
- New storage buckets or storage policies (PART 12)

### 2. `docs/migrations/NNNN_description.sql` — production changes
Incremental, idempotent SQL applied to live databases without data loss.
Each file is wrapped in a `do $migration$ begin ... end; $migration$;` block
that checks `schema_migrations` and skips if already applied.

**Every schema change needs BOTH files updated.**

### Migration file template

```sql
-- Migration NNNN: short description of what this does and why

do $migration$
begin
  if exists (select 1 from schema_migrations where version = 'NNNN') then
    raise notice 'Migration NNNN already applied, skipping.';
    return;
  end if;

  -- your DDL here (CREATE OR REPLACE, ALTER TABLE, INSERT, etc.)

  insert into schema_migrations (version, name)
  values ('NNNN', 'short_name');

  raise notice 'Migration NNNN applied.';
end;
$migration$;
```

### Deploy process (develop → production)

1. Merge code changes to `main`
2. Deploy the app (Vercel / your host)
3. In Supabase **production** SQL Editor, run each new migration file in order
4. Verify: `select * from schema_migrations order by version;`

### Rules
- Migration files are **append-only** — never edit a migration that has been applied to production
- Always write idempotent DDL (`CREATE OR REPLACE`, `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- Number migrations sequentially: `0001`, `0002`, `0003`, …
- If you forget to write a migration, derive it from the diff between schema.sql and what production currently has

## Project Specification

See `SPEC.md` in this directory for the full project specification including:
- Data model (all tables + SQL)
- Deletion edge cases & decision matrix
- SaaS database indexes
- Feature map & implementation phases
- Open questions

## Tech Stack

- **Monorepo**: Turbo + npm workspaces
- **Web**: TanStack Start (Vite, SSR) + TanStack Router (file-based routing)
- **Mobile**: Expo (React Native + NativeWind)
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase (Google OAuth + email/password)
- **Styling**: Tailwind CSS v4 + OKLCH colors
- **UI**: shadcn/ui (new-york) + MagicUI
- **Animation**: Motion (motion/react) — NOT framer-motion
- **Charts**: Recharts
- **Tables**: TanStack Table + TanStack Query v5
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable
- **Forms**: React Hook Form + Zod
- **AI**: Google Gemini (PDF bank statement parsing)
- **Icons**: Lucide React
- **Path alias**: `@/` → `src/`

## Key Design Rules

### Spaces
- `type = 'person'` → appears as "Paid by" in expenses
- `type = 'store'` → appears as "Location" in expenses + as grocery list columns
- `type = 'chore'` → board only, never shown in expense pickers
- All spaces soft-deleted (`deleted_at`), never hard deleted if expenses reference them

### Person Spaces & Member Lifecycle
- Every real member gets a **system person space** auto-created on join (`is_system = true`, `linked_user_id = <user_id>`)
- **Member limit counts ALL active person spaces** (real + virtual) — `personSpaces.length` in the UI
- A unique partial index (`spaces_family_linked_user_unique`) prevents duplicate active person spaces per user per family
- When a member is **removed** from `user_families`, their person space is **unlinked** (`linked_user_id = null`) — it becomes a virtual member, preserving expense history
- Virtual members (no `linked_user_id`) are manageable from Settings → Members → "Paid-by options"
- Virtual members can be **archived** (soft-delete, hides from pickers) or **hard deleted** (if 0 expenses)
- Archived virtual members can be **restored** via `restoreSpace()` — all data intact, just clears `deleted_at`
- `items.created_by` / `items.completed_by` use `ON DELETE SET NULL` on `auth.users` — only nulled if the auth account is fully deleted, not on family removal

### Categories
- Live in `categories` table per family — nothing hardcoded
- Soft-deleted (`deleted_at`); archived categories still show on historical expenses
- Delete dialog: if 0 expenses → hard delete; if >0 → "Archive" or "Reassign & Delete"

### Foreign Keys
- `expenses.category_id`, `expenses.location_id`, `expenses.paid_by_id` all use `ON DELETE SET NULL`
- UI shows "(Uncategorized)", "(Unknown location)", "(Unknown member)" for nulled FKs

### Date Handling
- **NEVER** use `new Date("YYYY-MM-DD")` — UTC shift breaks in US timezones
- Use `parseLocalDate()` from `@/lib/dateUtils` for all date string parsing
- Supabase DATE columns queried with plain strings (`"2026-01-15"`), never `.toISOString()`
- `items` uses TIMESTAMPTZ; `expenses` uses DATE (no time component)

### Multi-tenancy
- Every table has `family_id`; RLS enforces family isolation
- All queries scoped to `family_id` from auth context
- Indexes built around `(family_id, ...)` composite patterns

### Colors & Palette

`packages/config/src/index.ts` is the source of truth for the two palettes:
- `SPACE_COLORS` — 14 swatches shown in the Edit Space color picker
- `CHART_COLORS` — 12 colors used by all chart components (same hues as SPACE_COLORS)

Both use `oklch(0.82 0.10 <hue>)` — pastel, readable, family-friendly. Keep them in sync.

**Hardcoded copies that must be updated manually when the palette changes:**
- `apps/web/src/lib/config.ts` → `DEFAULT_CATEGORIES` (category colors for onboarding)
- `docs/schema.sql` → `find_or_create_family` RPC (same category colors, in SQL — can't import from JS)
- `docs/demo-seed.sql` → space and category colors

The SQL files can never import from the config package, so treat `packages/config/src/index.ts` as the reference and keep the SQL copies in sync by hand.

### Currency & Locale
- `formatCurrency()` for full display (tooltips, cards, tables)
- `formatCurrencyCompact()` for chart axis ticks
- Locale/currency stored per-family in `families` table

### Code Conventions
- TypeScript strict mode
- Imports sorted via `eslint-plugin-simple-import-sort`
- Unused vars prefixed with `_`
- `use<Feature>` hooks for queries, `use<Feature>Mutations` for mutations
- Feature components in `src/components/<feature>/`
- Shared entity types in `packages/types/src/`
