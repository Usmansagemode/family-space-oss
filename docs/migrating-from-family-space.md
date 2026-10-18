# Migrating from hosted family-space

`scripts/migrate-from-family-space/migrate.sh` copies one family from a
family-space database into a fresh Family Space instance. Row UUIDs are kept,
so every reference (expenses → categories, items → spaces, splits, budgets)
stays intact.

## What is copied

| Copied | Not copied |
|---|---|
| The family (name, currency, locale, calendar embed URL, onboarding state) | Plan, Stripe and suspension fields |
| Memberships and roles (owner stays owner) | Invites |
| Spaces, items, categories, expenses, income, recurring transactions, budgets | Google Calendar sync data (`google_event_id`, calendar id, refresh token) |
| Trackers and entries; split groups, participants, expenses, shares, settlements | Plan features, overrides, admin audit log |
| Activity log | |
| Members' display names and avatars, and the sign-in metadata (name, Google picture) | |

### How users are matched

Users are matched **by email** (case-insensitive) between the old database and
the new instance's Authentication → Users.

- **Members of the family** must already exist in the new instance. The script
  stops and lists any that are missing.
- **Former users** who are still referenced (item creator/completer, activity
  actor, an old person space) but have no account in the new instance get
  `NULL` there. This is the same thing `ON DELETE SET NULL` does when an account
  is deleted: items keep their history, and an unlinked person space becomes a
  "Paid by" option.

### Why triggers are paused during the import

The new instance has triggers that would rewrite the copied data:
`sort_order` is recalculated on insert, `created_by` is stamped with the
current user, adding an item writes an `item.added` activity row, and
`updated_at` is refreshed. The import disables user triggers on the tables it
writes inside its transaction (foreign keys stay enforced) and turns them back
on before committing, so rows arrive exactly as they were.

### Sign-in metadata

`find_or_create_family()` refreshes `profiles.name` and `avatar_url` from the
account's auth metadata on every sign-in, in both apps. The script copies the
old metadata (full name, name, Google picture) to the new accounts so the first
sign-in shows the same name and picture as the old app would.

### Avatars

Avatars uploaded to the old project's `avatars` bucket are downloaded from
their public URL, uploaded to the new bucket at `<new user id>/avatar.<ext>`,
and `profiles.avatar_url` is rewritten to the new URL. Google picture URLs are
left as they are. As in the old app, the sign-in refresh above replaces an
uploaded avatar with the account's metadata picture at the member's next
sign-in.

## Safety

- The source is only read. Every source query runs in a read-only session
  (`default_transaction_read_only`), and the script stops if the server did not
  apply that setting.
- The script stops if the new instance already has a family or memberships.
- The import is one transaction: on any error, nothing is written.
- Before exporting, it inspects the **live** source schema and stops if it finds
  a table with `family_id`, or a column referencing users, that it does not
  know how to handle. Columns that the new schema no longer has (plan, Stripe,
  suspension, Google sync) are listed as dropped.
- Verification runs inside the transaction: the row count of every table and
  the expense total of every month must match the source, or the import rolls
  back.

## Runbook

The order matters: **create the users, don't sign in, then migrate.** Signing
in to an empty instance creates a new family, and the script then refuses to
run.

### 1. Prerequisites

- `psql` (macOS: `brew install libpq && brew link --force libpq`), `curl`, Node.js
- The family-space **database connection string** (Supabase dashboard →
  Connect): the direct connection or the **session pooler (port 5432)**, as
  the `postgres` user. The transaction pooler (port 6543) cannot hold the
  read-only session setting. Other roles see no rows because of RLS.
- Everyone stops using family-space from step 5 until step 7. Anything added
  there after `--apply` is not copied, and a change during the export makes
  verification fail.
- The family id. In the family-space SQL editor:
  ```sql
  select id, name from families;
  ```

### 2. Create the new instance

```bash
scripts/setup.sh
```

Use the **same email** as your family-space account for the owner. Do not sign
in yet.

### 3. Create every family member

Supabase dashboard of the new project → Authentication → Users → Add user →
Create new user, with each member's family-space email and **Auto Confirm User**
ticked (see [self-hosting.md](self-hosting.md#adding-family-members)). Nobody
signs in yet. Only create accounts for people who should have access: a member
you removed in family-space joins the family if you create their account.

### 4. Set the environment

```bash
export SOURCE_DB_URL='postgresql://…family-space…'
export SOURCE_FAMILY_ID='<family id from step 1>'
export TARGET_DB_URL='postgresql://…new project…'   # dashboard → Connect, postgres user (owns the tables)
export TARGET_API_URL='https://<new-ref>.supabase.co'
export TARGET_SERVICE_ROLE_KEY='…'                   # from apps/web/.env
```

### 5. Dry run

```bash
scripts/migrate-from-family-space/migrate.sh --dry-run
```

Read the output:

- **Matched users** and **former users** that will become `NULL`
- Rows per table, and **dropped columns** (expected: `plan`, `stripe_*`,
  `suspended_*`, `google_*`, `items.google_event_id`)
- `verify …` lines and `verification passed`

Nothing is written. The import runs and is rolled back.

### 6. Migrate

```bash
scripts/migrate-from-family-space/migrate.sh --apply
```

This prints the same verification, then `copied avatar for …` for each
uploaded avatar. If the last step prints `WARN` lines (network error, wrong
service key), fix the cause and run
`scripts/migrate-from-family-space/migrate.sh --post-only`; it redoes only the
sign-in metadata and avatars on the migrated family. Don't sign in until it finishes: the sign-in metadata is copied
after the database commit.

### 7. Check

Sign in as the owner, then a member, and walk through
[parity-checklist.md](parity-checklist.md).

### 8. Clean up

- The script prints where its exports are (a temp directory, mode 700). They
  contain your family's data; delete the directory.
- If you connected Google Calendar in family-space, revoke the app's access in
  your Google account settings. The new app never uses that token.

## Starting over

The script never overwrites an instance that has a family. To retry on the same
new project before anyone uses it, run `docs/schema.sql` in its SQL editor
(this drops all app tables), then run the dry run again. Users in
Authentication stay as they are.
