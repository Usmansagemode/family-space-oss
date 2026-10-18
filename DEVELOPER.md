# Family Space — Developer Guide

How to run the app locally and the conventions the code follows. For standing
up a real instance, see [docs/self-hosting.md](docs/self-hosting.md); for where
things live, see [docs/CODEBASE.md](docs/CODEBASE.md).

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | |
| npm | 10+ | Workspaces (`apps/*`, `packages/*`) |
| Docker | any | Local Supabase stack |

## Local setup

```bash
npm install
scripts/setup.sh --local   # Supabase in Docker + schema + owner user + apps/web/.env
npm run dev                # web on http://localhost:3000
```

`scripts/setup.sh --local` starts the Supabase CLI stack from
`supabase/config.toml` (sign-ups disabled, the `avatars` bucket), applies
`docs/schema.sql` once, writes `apps/web/.env` and creates the owner account.
Sign in with that account; the first sign-in runs onboarding. Add more users in
the local dashboard (`npx supabase@2.121.0 status` prints its URL) or through
the Auth admin API.

Without `apps/web/.env` the app starts with no backend: the sign-in page
renders but nobody can sign in.

To start over with an empty database, re-run `docs/schema.sql` against the
local stack. It drops every table first:

```bash
docker exec -i supabase_db_family-space psql -U postgres -1 -v ON_ERROR_STOP=1 < docs/schema.sql
```

## Scripts

Run from the repo root (Turborepo):

| Command | What it does |
|---|---|
| `npm run dev` | Web dev server (port 3000) and Expo |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (`packages/utils`) |
| `npx tsc --noEmit -p apps/web` | Type-check the web app |

## Database changes

`docs/schema.sql` is the complete definition and the baseline. Follow the rules
in `CLAUDE.md` → "Schema Changes": update `schema.sql` for every change, and
add a `docs/migrations/NNNN_*.sql` file once instances with data exist.

## Conventions

### Data fetching

Server state lives in TanStack Query. Shared hooks are in `packages/hooks`
(`use<Feature>` for queries, `use<Feature>Mutations` for mutations); Supabase
queries are in `packages/supabase`. Common query keys:

| Key | Data |
|---|---|
| `['family', 'user', userId]` | The family (from `find_or_create_family`) |
| `['family-members', familyId]` | Members with profiles |
| `['spaces', familyId]` | Board columns |
| `['items', spaceId]` | Items in one column |

### Mutations

Every mutation shows `toast.error` on failure and invalidates related keys on
success.

### Sheet closing pattern

Sheets do not close themselves on submit. The parent closes the sheet in the
mutation's `onSuccess`, so the sheet and its loader stay visible until the
server confirms:

```ts
create.mutate(input, { onSuccess: () => setOpen(false) })
```

### Space types

| Type | Board | Expenses |
|---|---|---|
| `person` | Chore column; items can have dates | "Paid by" |
| `store` | Grocery column; items can have a quantity | "Location" |
| `chore` | Chore column; items can have dates | Never shown |

`show_in_expenses` hides a person or store from the expense pickers.

### Dates

- Items store `TIMESTAMPTZ`. A date picked without a time is stored at noon
  local time; `hasExplicitTime()` treats 12:00 as "no time".
- Expenses store `DATE`. Parse date strings with `parseLocalDate()` from
  `@family/utils`, never `new Date('YYYY-MM-DD')`.

### Recurring items

Items with a `recurrence` RRULE are never marked done; completing one advances
it to the next occurrence (`advanceRecurringItem`). The calendar expands
recurring items into virtual occurrences.

### Activity feed

`activity_log` is written by triggers on `items` (`item.added`,
`item.completed`), by the client (`expense.added`, `expenses.imported`) and by
`find_or_create_family` (`member.joined`). `useActivityFeed` resolves actor
names from the member list.

### Code style

- Prettier: `semi: false`, `singleQuote: true`, `trailingComma: 'all'`
- TypeScript strict mode
- Web path alias: `#/` → `apps/web/src/`

## Troubleshooting

**Google sign-in fails with "Signups not allowed for this instance".** The user
doesn't exist yet, or their Google address differs from the account email.
Create the user with the exact Google email (see self-hosting.md).

**Email sign-in says "Email logins are disabled".** `[auth.email]
enable_signup` was set to `false`; it must stay `true`.

**Lists come back empty without an error.** A missing RLS policy or grant
returns empty arrays. Re-run `docs/schema.sql` on a fresh database, or compare
the instance with PART 3 (grants) and PART 10 (policies).

**The app keeps running without a backend after adding `.env`.** Vite reads
`apps/web/.env` at startup; restart the dev server.
