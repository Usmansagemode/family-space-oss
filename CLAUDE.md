# Family Space

Self-hosted app for one family: grocery lists, chores, a family calendar, and household finances. One deployment = one family (see `docs/self-hosting.md`).

## Development Workflow

1. **Read the GitHub issue** — the full body, not just the title. Confirm files and acceptance criteria before writing code.
2. **Plan** — state the change in one short paragraph before writing files.
3. **Review** — get the change reviewed before committing, and fix every critical finding.
4. **Commit** — stage only the files for the task; reference the issue (`closes #N` or `refs #N`).

## Single-Family Model

- Exactly one `families` row (`families_singleton` unique index). Keep `family_id` columns, RLS and family-scoped queries as they are.
- Sign-ups are disabled in Supabase (`supabase/config.toml`); the owner creates users in the dashboard.
- `find_or_create_family()` (no arguments, uses `auth.uid()`) runs on every login: empty DB → caller becomes owner and gets onboarding; otherwise the caller joins as a member (membership row, system person space, `member.joined` activity).
- Onboarding is owner-only (`families_update` RLS is owner-only).
- Removing a member also bans their auth account (`apps/web/src/lib/server/block-member.ts`), because any signed-in user would otherwise rejoin on next login.
- Server functions that need the service-role key: `delete-account.ts`, `block-member.ts` (`SUPABASE_SERVICE_ROLE_KEY`).

## Deployer (`apps/deployer`)

- Browser counterpart of `scripts/setup.sh` (hosted mode), served at family-space-deploy.usmankm.com. `apps/deployer/README.md` maps every step to its API call.
- Keep it in step with `setup.sh` and `supabase/config.toml`: a new setup step or auth/storage/api setting must be added to `src/deploy/` too (`authConfig()` mirrors `[auth]`).
- `docs/schema.sql` is bundled at build time. The schema guard treats the last object the file creates (`SCHEMA_SENTINEL_POLICY`) as proof it ran completely; `tests/deploy.test.ts` fails if that stops being true.
- `api/supabase.ts` is an allowlist: a new Management API call needs a new route there.

## Schema Changes

Two files must always be kept in sync for every database change:

### 1. `docs/schema.sql` — fresh install reference
The complete database definition. Safe to re-run (drops and rebuilds everything).
Used for: local dev setup, new environments, disaster recovery.
**Never run on an instance with data** — it drops all tables.

Always update `schema.sql` when making any database change:
- New tables or columns
- Modified column types, defaults, or constraints
- New or changed RLS policies
- New or changed triggers or functions
- New indexes
- New storage buckets or storage policies (PART 12)

### 2. `docs/migrations/NNNN_description.sql` — changes for existing instances
`schema.sql` is the baseline. Migrations start at `0001` and are needed once an
instance with data exists; until then, update `schema.sql` only.

Incremental, idempotent SQL applied to live databases without data loss.
Each file is wrapped in a `do $migration$ begin ... end; $migration$;` block
that checks `schema_migrations` and skips if already applied.

**Once instances exist, every schema change needs BOTH files updated.**

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

### Deploy process

1. Merge code changes to `main`
2. Deploy the app (Vercel / your host)
3. In the instance's Supabase SQL Editor, run each new migration file in order
4. Verify: `select * from schema_migrations order by version;`

### Rules
- Migration files are **append-only** — never edit a migration that has been applied to an instance
- Always write idempotent DDL (`CREATE OR REPLACE`, `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- Number migrations sequentially: `0001`, `0002`, `0003`, …
- If you forget to write a migration, derive it from the diff between schema.sql and what the instance currently has

## Project Specification

See `SPEC.md` for the data model summary, deletion rules and feature map.

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
- **Path alias**: `#/` → `src/` (web)

## Key Design Rules

### Spaces
- `type = 'person'` → appears as "Paid by" in expenses
- `type = 'store'` → appears as "Location" in expenses + as grocery list columns
- `type = 'chore'` → board only, never shown in expense pickers
- All spaces soft-deleted (`deleted_at`), never hard deleted if expenses reference them

### Person Spaces & Member Lifecycle
- Every real member gets a **system person space** auto-created on join (`is_system = true`, `linked_user_id = <user_id>`)
- A unique partial index (`spaces_family_linked_user_unique`) prevents duplicate active person spaces per user per family
- When a member is **removed** from `user_families`, their person space is **unlinked** (`linked_user_id = null`) — it becomes a virtual member, preserving expense history — and their auth account is banned
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
- Use `parseLocalDate()` from `@family/utils` (re-exported by `#/lib/date-utils`) for all date string parsing
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

The SQL file can never import from the config package, so treat `packages/config/src/index.ts` as the reference and keep the SQL copy in sync by hand.

### Currency & Locale
- `formatCurrency()` for full display (tooltips, cards, tables)
- `formatCurrencyCompact()` for chart axis ticks
- Locale/currency stored per-family in `families` table

### Code Conventions
- TypeScript strict mode
- Unused vars prefixed with `_`
- `use<Feature>` hooks for queries, `use<Feature>Mutations` for mutations
- Feature components in `src/components/<feature>/`
- Shared entity types in `packages/types/src/`
