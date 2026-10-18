# Family Space — Specification

A self-hosted app for one family: shared grocery and chore lists, a family
calendar, and household finances. One deployment serves exactly one family.

## 1. Principles

- Data belongs to the family, not an individual user.
- Everything configurable (people, stores, chore areas, categories) lives in the
  database; nothing is hardcoded after onboarding seeds the defaults.
- Financial history is never destroyed silently: soft deletes, and
  `ON DELETE SET NULL` on expense references.
- Every table carries `family_id` and RLS checks membership. With a single
  family this is defence in depth; the code stays family-scoped.
- Currency and locale are per family.

## 2. Accounts and the family

- Sign-ups are disabled. The owner creates each account in the Supabase
  dashboard (auto-confirmed); see `docs/self-hosting.md`.
- Sign-in: email/password and Google. Google links to the existing account with
  the same email.
- `find_or_create_family()` runs on every sign-in:
  - empty database → creates the family with default categories, makes the
    caller the **owner**, and sends them through onboarding;
  - family exists → adds the caller as a **member** with a system person space
    and a `member.joined` activity entry.
- `families_singleton` allows only one family row; an advisory lock serialises
  concurrent first sign-ins.
- Only the owner can update family settings, so only the owner sees
  onboarding.
- Removing a member deletes their membership, unlinks their person space and
  bans their account.

## 3. Data model

`docs/schema.sql` is the complete definition (tables, triggers, RPCs, RLS,
indexes, storage policies). Summary:

| Table | Purpose |
|---|---|
| `families` | The family: name, currency, locale, Google Calendar embed URL, onboarding state |
| `profiles` | Mirrors `auth.users` (name, email, avatar) |
| `user_families` | Membership and role (`owner` / `member`) |
| `spaces` | Board columns: `person`, `store`, `chore` |
| `items` | Board cards: title, quantity, dates, RRULE recurrence, completion |
| `categories` | Expense categories (soft-deleted) |
| `expenses` | Amount, date, category, location (store), paid by (person) |
| `income_entries` | Income per person and type |
| `recurring_transactions` | Templates that generate expenses or income |
| `budgets` | Monthly/yearly per category and/or person |
| `trackers`, `tracker_entries` | Debt/savings balances with history |
| `split_groups`, `split_participants`, `split_expenses`, `split_shares`, `split_settlements` | Splitwise-style groups |
| `activity_log` | Family event stream |

### Spaces

| Type | Board | Expense pickers |
|---|---|---|
| `person` | Chore column | "Paid by" |
| `store` | Grocery column | "Location" |
| `chore` | Chore column | Never |

`show_in_expenses` hides a person or store from the pickers. Every member has a
system person space (`is_system`, `linked_user_id`). People without an account
are virtual person spaces, managed under Settings → Members → Paid-by options.

## 4. Deletion rules

### Categories and spaces with expenses

1. Count referencing expenses.
2. **0** → hard delete.
3. **>0** → choose:
   - **Archive** (default): sets `deleted_at`, hides it from pickers; existing
     expenses keep showing the name. Reversible.
   - **Reassign & Delete**: move every expense to another category or space,
     then hard delete.

`ON DELETE SET NULL` on the expense foreign keys is the last safety net; the UI
shows "(Uncategorized)", "(Unknown location)" or "(Unknown member)".

### Members

- Expenses point at the person space, not the user, so history survives.
- The person space is unlinked (`linked_user_id = null`) and becomes a virtual
  person.
- `items.created_by` / `completed_by` are nulled only if the auth user is
  deleted.
- A system person space linked to an active member cannot be deleted
  (`prevent_active_system_space_delete` trigger).

## 5. Feature map

### Board
- Grocery lists by store, chore lists by person or area
- Drag to reorder within and across columns; focus mode for one column
- Recurring items advance on completion; history with re-add; search

### Calendar
- In-app week and month calendar of dated items from person and chore columns,
  with recurring occurrences expanded
- Upcoming timeline on the analytics page
- Optional Google Calendar embed (iframe) toggle when an embed URL is set

### Finances
- Monthly expense table: inline edit, bulk edit/delete, duplicate detection
- Income entries; recurring expenses and income with catch-up on missed dates
- Budgets per category and per person
- CSV import with column mapping; AI PDF import through Gemini (user-supplied
  key, stored in the browser)
- Yearly analytics (charts by month, category, location, person; filters) with
  PDF and Excel export
- Trackers for debts and savings; split groups with settle-up

### Family settings
- Family name, currency, locale, Google Calendar embed URL
- Members (owner badge, remove), per-member budgets, paid-by options
- Locations (stores) and categories: add, reorder, recolor, archive, delete
- Account: name, avatar, link Google, delete account
- Integrations: Gemini API key and model

### Activity
- Item added/completed, expense added, expenses imported, member joined (last
  14 days)
