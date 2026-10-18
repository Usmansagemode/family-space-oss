# Family Space — Developer Guide

This document covers everything needed to go from zero to a running local development environment, including all third-party service setup.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & install](#2-clone--install)
3. [Environment variables](#3-environment-variables)
4. [Supabase setup](#4-supabase-setup)
5. [Google OAuth setup](#5-google-oauth-setup)
6. [Google Calendar API setup](#6-google-calendar-api-setup)
7. [Running locally](#7-running-locally)
8. [Project structure](#8-project-structure)
9. [Key patterns & conventions](#9-key-patterns--conventions)
10. [Deployment](#10-deployment)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

| Tool    | Version | Notes                                                                            |
| ------- | ------- | -------------------------------------------------------------------------------- |
| Node.js | 20+     | Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) |
| npm     | 10+     | Comes with Node                                                                  |
| Git     | any     | —                                                                                |

You will also need accounts on:

- [Supabase](https://supabase.com) (free tier is fine)
- [Google Cloud Console](https://console.cloud.google.com)

---

## 2. Clone & install

```bash
git clone <repo-url> family-space
cd family-space
npm install
```

---

## 3. Environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values come from your Supabase project (see section 4).

> **Demo mode**: If either variable is missing or the file does not exist, the app runs in demo mode with in-memory data and no authentication. This is useful for UI work that does not need a real backend.

---

## 4. Supabase setup

### 4.1 Create a project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**, choose a name (e.g. `family-space`), pick a region close to your users, set a database password.
3. Wait for the project to provision (~1 min).

### 4.2 Get your API keys

In the Supabase dashboard go to **Project Settings → API**.

- Copy **Project URL** → `VITE_SUPABASE_URL`
- Copy **anon / public** key → `VITE_SUPABASE_ANON_KEY`

Paste both into your `.env` file.

### 4.3 Run the database schema

Go to **SQL Editor** in the Supabase dashboard and run the entire script below in one shot.

> **Why one script?** The setup has dependencies between tables, grants, functions, and policies that must run in order. Copy the whole block and click **Run**.

```sql
-- ================================================================
-- FAMILY SPACE — COMPLETE DATABASE SETUP
-- Safe to re-run: drops everything first, then rebuilds clean.
-- ================================================================


-- ----------------------------------------------------------------
-- PART 1: DROP EVERYTHING
-- ----------------------------------------------------------------

drop table if exists items         cascade;
drop table if exists invites       cascade;
drop table if exists spaces        cascade;
drop table if exists user_families cascade;
drop table if exists families      cascade;
drop table if exists profiles      cascade;

drop function if exists find_or_create_family(uuid)     cascade;
drop function if exists accept_invite(uuid, uuid, uuid) cascade;
drop function if exists is_family_member(uuid)          cascade;
drop function if exists is_family_owner(uuid)           cascade;
drop function if exists item_is_family_member(uuid)     cascade;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user() cascade;

drop trigger if exists set_item_created_by_trigger on items;
drop function if exists set_item_created_by() cascade;


-- ----------------------------------------------------------------
-- PART 2: TABLES
-- ----------------------------------------------------------------

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  avatar_url text,
  created_at timestamptz default now()
);

create table families (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  google_calendar_id        text,
  google_calendar_embed_url text,
  created_at                timestamptz default now()
);

create table user_families (
  user_id   uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references families(id)   on delete cascade,
  role      text not null default 'member', -- 'owner' | 'member'
  joined_at timestamptz default now(),
  primary key (user_id, family_id),
  -- Second FK to profiles required for PostgREST to resolve the join in
  -- fetchFamilyMembers: .select('user_id, role, profiles(name, email, avatar_url)')
  constraint user_families_profile_fkey
    foreign key (user_id) references profiles(id) on delete cascade
);

create table spaces (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families(id) on delete cascade,
  name       text not null,
  color      text not null,
  type       text not null default 'store', -- 'person' | 'store'
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create table items (
  id              uuid primary key default gen_random_uuid(),
  space_id        uuid not null references spaces(id) on delete cascade,
  title           text not null,
  description     text,
  quantity        text,         -- store spaces only (e.g. "2", "500g", "1 dozen")
  start_date      timestamptz,  -- person spaces only
  end_date        timestamptz,  -- person spaces only
  recurrence      text,             -- null | 'daily' | 'weekly' | 'monthly' | 'yearly'
  completed       boolean not null default false,
  completed_at    timestamptz,
  google_event_id text,
  sort_order      integer not null default 0,
  created_by      uuid references auth.users(id) on delete set null, -- auto-set by trigger
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table invites (
  token       uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  accepted_at timestamptz,
  created_at  timestamptz default now()
);


-- ----------------------------------------------------------------
-- PART 3: GRANTS
-- Supabase auto-grants these for tables created via the UI.
-- SQL-created tables start with no grants, so RLS blocks everything
-- before policies are even evaluated without these.
-- ----------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on profiles      to authenticated;
grant select, insert, update, delete on families      to authenticated;
grant select, insert, update, delete on user_families to authenticated;
grant select, insert, update, delete on spaces        to authenticated;
grant select, insert, update, delete on items         to authenticated;
grant select                          on invites       to anon;
grant select, insert, update          on invites       to authenticated;


-- ----------------------------------------------------------------
-- PART 4: RLS HELPER FUNCTIONS
-- Must return boolean (scalar) — set-returning functions are not
-- allowed in policy expressions.
-- SECURITY DEFINER lets them query user_families without going
-- through RLS on that table (prevents infinite recursion).
-- ----------------------------------------------------------------

create or replace function is_family_member(fid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(
    select 1 from user_families where user_id = auth.uid() and family_id = fid
  )
$$;

create or replace function is_family_owner(fid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(
    select 1 from user_families
    where user_id = auth.uid() and family_id = fid and role = 'owner'
  )
$$;

-- For items: checks membership via the parent space
create or replace function item_is_family_member(sid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(
    select 1
    from spaces s
    join user_families uf on uf.family_id = s.family_id
    where s.id = sid and uf.user_id = auth.uid()
  )
$$;

grant execute on function is_family_member(uuid)      to authenticated;
grant execute on function is_family_owner(uuid)       to authenticated;
grant execute on function item_is_family_member(uuid) to authenticated;


-- ----------------------------------------------------------------
-- PART 5: RPC FUNCTIONS (SECURITY DEFINER)
-- Used for operations that touch multiple tables or must run before
-- the user has any membership row yet. Called via supabase.rpc()
-- from the app — never as direct table inserts.
--
-- Profile creation lives here (not in a trigger on auth.users)
-- because Supabase restricts trigger creation on the auth schema.
-- ----------------------------------------------------------------

-- Called on every login. Upserts the profile and returns the user's
-- family, creating one (as owner) if they don't have one yet.
create or replace function find_or_create_family(p_user_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_family_id uuid;
  v_family    families%rowtype;
begin
  insert into profiles (id, name, email, avatar_url)
  select id, raw_user_meta_data->>'full_name', email, raw_user_meta_data->>'avatar_url'
  from auth.users where id = p_user_id
  on conflict (id) do update
    set name = excluded.name, email = excluded.email, avatar_url = excluded.avatar_url;

  select family_id into v_family_id
  from user_families where user_id = p_user_id
  order by joined_at asc limit 1;

  if v_family_id is not null then
    select * into v_family from families where id = v_family_id;
    return row_to_json(v_family);
  end if;

  insert into families (name) values ('Our Family') returning * into v_family;
  insert into user_families (user_id, family_id, role) values (p_user_id, v_family.id, 'owner');
  return row_to_json(v_family);
end;
$$;

-- Called when a user accepts a family invite link.
-- Upserts their profile, removes their auto-created solo family,
-- then adds them to the invited family.
create or replace function accept_invite(p_token uuid, p_user_id uuid, p_family_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, email, avatar_url)
  select id, raw_user_meta_data->>'full_name', email, raw_user_meta_data->>'avatar_url'
  from auth.users where id = p_user_id
  on conflict (id) do update
    set name = excluded.name, email = excluded.email, avatar_url = excluded.avatar_url;

  -- Delete families where the user is the only member (auto-created on signup)
  delete from families
  where id in (
    select uf.family_id from user_families uf
    where uf.user_id = p_user_id
      and uf.family_id != p_family_id
      and (select count(*) from user_families where family_id = uf.family_id) = 1
  );

  -- Remove user from any remaining families
  delete from user_families where user_id = p_user_id and family_id != p_family_id;

  -- Join the invited family
  insert into user_families (user_id, family_id, role)
  values (p_user_id, p_family_id, 'member')
  on conflict (user_id, family_id) do nothing;

  update invites set accepted_at = now() where token = p_token;
end;
$$;

grant execute on function find_or_create_family(uuid)        to authenticated;
grant execute on function accept_invite(uuid, uuid, uuid)    to authenticated;


-- ----------------------------------------------------------------
-- PART 6: TRIGGERS
-- ----------------------------------------------------------------

-- Auto-stamp created_by on every new item so the activity feed can
-- show who added each item without the app passing auth.uid() manually.
-- A trigger on items (not auth.users) is fine — Supabase only restricts
-- trigger creation on the auth schema.
create or replace function set_item_created_by()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  NEW.created_by := auth.uid();
  return NEW;
end;
$$;

create trigger set_item_created_by_trigger
  before insert on items
  for each row execute function set_item_created_by();


-- ----------------------------------------------------------------
-- PART 8: ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------

alter table profiles      enable row level security;
alter table families      enable row level security;
alter table user_families enable row level security;
alter table spaces        enable row level security;
alter table items         enable row level security;
alter table invites       enable row level security;


-- ----------------------------------------------------------------
-- PART 9: POLICIES
-- INSERT on families and user_families is intentionally omitted —
-- those go through the SECURITY DEFINER RPCs, never directly.
-- ----------------------------------------------------------------

-- profiles
create policy "profiles_select" on profiles
  for select to authenticated using (true);
create policy "profiles_update" on profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- families
create policy "families_select" on families
  for select to authenticated using (is_family_member(id));
create policy "families_update" on families
  for update to authenticated
  using (is_family_owner(id)) with check (is_family_owner(id));
create policy "families_delete" on families
  for delete to authenticated using (is_family_owner(id));

-- user_families
create policy "user_families_select" on user_families
  for select to authenticated using (is_family_member(family_id));
create policy "user_families_delete" on user_families
  for delete to authenticated
  using (user_id = auth.uid() or is_family_owner(family_id));

-- spaces
create policy "spaces_select" on spaces
  for select to authenticated using (is_family_member(family_id));
create policy "spaces_insert" on spaces
  for insert to authenticated with check (is_family_member(family_id));
create policy "spaces_update" on spaces
  for update to authenticated
  using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "spaces_delete" on spaces
  for delete to authenticated using (is_family_member(family_id));

-- items
create policy "items_select" on items
  for select to authenticated using (item_is_family_member(space_id));
create policy "items_insert" on items
  for insert to authenticated with check (item_is_family_member(space_id));
create policy "items_update" on items
  for update to authenticated
  using (item_is_family_member(space_id)) with check (item_is_family_member(space_id));
create policy "items_delete" on items
  for delete to authenticated using (item_is_family_member(space_id));

-- invites
create policy "invites_select"  on invites for select using (true);
create policy "invites_insert"  on invites
  for insert to authenticated with check (is_family_member(family_id));
create policy "invites_update"  on invites
  for update to authenticated using (true) with check (true);
```

---

## 5. Google OAuth setup

This enables "Sign in with Google" and grants the app permission to write to Google Calendar on behalf of the user.

### 5.1 Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Click the project dropdown at the top → **New Project**.
3. Give it a name (e.g. `family-space`) and click **Create**.

### 5.2 Enable the Google Calendar API

1. In the left sidebar go to **APIs & Services → Library**.
2. Search for **Google Calendar API** and click it.
3. Click **Enable**.

### 5.3 Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** and click **Create**.
3. Fill in:
   - **App name**: Family Space
   - **User support email**: your email
   - **Developer contact email**: your email
4. Click **Save and Continue** through the Scopes screen (you will add scopes via Supabase).
5. On the **Test users** screen, add the Gmail addresses of everyone who will use the app during development/testing.
6. Click **Save and Continue** until done.

> **Production**: When you want anyone to sign in (not just test users), you will need to submit the app for Google verification. For personal family use, keeping it in testing mode is fine indefinitely.

### 5.4 Create OAuth credentials

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth 2.0 Client ID**.
3. Choose **Web application**.
4. Under **Authorised redirect URIs** add:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Replace `<your-project-ref>` with your actual Supabase project reference (visible in your Supabase URL).
5. Click **Create**.
6. Copy the **Client ID** and **Client Secret** — you will need them in the next step.

### 5.5 Configure Supabase Google provider

1. In the Supabase dashboard go to **Authentication → Providers**.
2. Find **Google** and toggle it on.
3. Paste in the **Client ID** and **Client Secret** from step 5.4.
4. Make sure the **Callback URL** shown matches what you added in Google Cloud.
5. Click **Save**.

### 5.6 Add Calendar scope

The app needs the `calendar.events` scope so it can create and delete events.

In Supabase, go to **Authentication → Providers → Google** and add this to the **Scopes** field (space-separated):

```
https://www.googleapis.com/auth/calendar.events
```

Save again.

### 5.7 Test sign-in

1. Start the dev server (`npm run dev`).
2. Open `http://localhost:3000`.
3. Click **Sign in with Google**.
4. Complete the Google auth flow.
5. You should land on the board view. If you see an error, check [Troubleshooting](#11-troubleshooting).

---

## 6. Google Calendar API setup

This is optional. The app works without it — items simply won't sync to Google Calendar.

### 6.1 Create a dedicated calendar

1. Open [Google Calendar](https://calendar.google.com).
2. In the left sidebar under **Other calendars** click the **+** icon.
3. Choose **Create new calendar**.
4. Give it a name (e.g. `Family Space`) and click **Create calendar**.

### 6.2 Find the Calendar ID

1. Click the three dots next to your new calendar → **Settings**.
2. Scroll down to **Integrate calendar**.
3. Copy the **Calendar ID** — it looks like `abc123@group.calendar.google.com`.

### 6.3 Get the embed URL

On the same Settings page, scroll down to **Integrate calendar** and find the **Embed code** section.

The embed URL looks like:

```
https://calendar.google.com/calendar/embed?src=abc123%40group.calendar.google.com&ctz=America%2FNew_York
```

Copy the full URL (not the `<iframe>` tag, just the `src` value).

### 6.4 Add both to Family Space settings

1. Sign in to the app.
2. Click the avatar in the top-right → **Settings**.
3. Paste the **Calendar ID** into the Google Calendar ID field.
4. Paste the **embed URL** into the Calendar Embed URL field.
5. Click **Save**.

Any item you create with a date will now appear in that Google Calendar automatically.

---

## 7. Running locally

```bash
# Start dev server (port 3000)
npm run dev

# Type-check
npx tsc --noEmit

# Lint + format
npm run check

# Build for production
npm run build

# Preview production build
npm run preview
```

The app runs on `http://localhost:3000` in dev mode.

---

## 8. Project structure

```
src/
├── routes/
│   ├── __root.tsx        # Root shell: providers, Header, Toaster
│   └── index.tsx         # Main page: auth gate, Board/Calendar tabs
│
├── components/
│   ├── ui/               # shadcn/ui primitives (Radix UI wrappers)
│   ├── auth/
│   │   └── LoginPage.tsx # Public landing page + sign-in button
│   ├── board/
│   │   ├── SpaceView.tsx     # Horizontal drag-and-drop board
│   │   ├── SpaceColumn.tsx   # Single space column
│   │   ├── ItemCard.tsx      # Task card with checkbox
│   │   ├── AddItemSheet.tsx  # Create / edit item form
│   │   ├── AddSpaceSheet.tsx # Create / edit space form
│   │   └── HistorySheet.tsx  # Completed items with re-add
│   ├── Header.tsx        # App header with family name + user dropdown
│   ├── SettingsSheet.tsx # Family name, calendar ID, embed URL
│   ├── ActivitySheet.tsx # Slide-in sheet showing recent family activity
│   └── CalendarView.tsx  # Google Calendar iframe
│
├── hooks/
│   ├── auth/
│   │   ├── useUserFamily.ts       # Fetch/create family for current user
│   │   └── useFamilyMembers.ts    # Fetch all members of a family
│   ├── family/
│   │   └── useActivityFeed.ts     # Recent add/complete events for the activity sheet
│   ├── spaces/
│   │   ├── useSpaces.ts           # Read spaces for a family
│   │   └── useSpaceMutations.ts   # Create, update, delete, reorder spaces
│   └── items/
│       ├── useItems.ts            # Read items for a space
│       └── useItemMutations.ts    # Create, update, complete, delete, re-add items
│
├── contexts/
│   ├── auth.tsx          # AuthContext: user, providerToken, signIn, signOut
│   └── board.tsx         # BoardContext: familyId, providerToken, calendarId
│
├── entities/
│   ├── Item.ts           # Item TypeScript type
│   └── Space.ts          # Space TypeScript type
│
├── lib/
│   ├── supabase.ts           # Supabase client (null in demo mode)
│   ├── google-calendar.ts    # Google Calendar REST API wrappers
│   ├── config.ts             # SPACE_COLORS palette, DEMO_FAMILY_ID
│   ├── utils.ts              # cn(), formatDate(), hasExplicitTime(), useIsDark()
│   └── supabase/
│       ├── families.ts       # Family CRUD + member listing + invites
│       ├── spaces.ts         # Space CRUD + reorder
│       ├── items.ts          # Item CRUD + complete + reAdd + advanceRecurring
│       └── activity.ts       # Fetch recent add/complete events for activity feed
│
└── styles.css            # Tailwind v4 + OKLCH theme variables
```

---

## 9. Key patterns & conventions

### Demo mode

If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are not set, `isDemoMode = true`. Every data function in `src/lib/supabase/` has an in-memory fallback branch. Use this for UI development without a Supabase connection.

### Data fetching

All server state lives in TanStack Query. Query keys follow this convention:

```ts
;['family', familyId][('family', 'user', userId)][('spaces', familyId)][ // single family by ID // family belonging to a user // spaces for a family
  ('items', spaceId)
] // items for a space
```

### Mutations

Mutations are grouped in `useXxxMutations` hooks. Each returns `{ create, update, remove, ... }`. Every mutation shows a `toast.error` on failure. Invalidate related query keys in `onSuccess`.

### Sheet closing pattern

Sheets do **not** close themselves on submit. The parent component closes the sheet in the mutation's `onSuccess` callback:

```ts
create.mutate(input, { onSuccess: () => setOpen(false) })
```

This keeps the sheet (and its loader) visible until the server confirms success.

### Space type behaviour

`SpaceType` is `'person' | 'store'`. The two types have different item fields:

| Field                     | `person`          | `store`                        |
| ------------------------- | ----------------- | ------------------------------ |
| `quantity`                | —                 | ✓ free-text (e.g. "2", "500g") |
| `start_date` / `end_date` | ✓                 | —                              |
| Google Calendar sync      | ✓ (when date set) | —                              |

`AddItemSheet` receives a `spaceType` prop and conditionally renders the relevant fields. `ItemCard` shows `× {quantity}` inline when quantity is present.

### Space colours

Colours are OKLCH strings (e.g. `oklch(0.88 0.10 230)`). The `extractHue()` utility pulls the hue component out for per-space checkbox and card theming. The palette is defined in `src/lib/config.ts`.

### Date sentinel

When a user picks a date with no time, the date is stored at noon local time (`T12:00:00`). `hasExplicitTime(date)` returns `false` when hours === 12 and minutes === 0. This keeps dates and datetimes in the same column in Supabase.

### Recurring items

Items with a `recurrence` value (`daily | weekly | monthly | yearly`) are never marked done — completing them advances the date to the next occurrence instead. The `complete` mutation in `useItemMutations` handles this: it deletes the old Google Calendar event, creates a new one at the next date, and calls `advanceRecurringItem` in Supabase. `ItemCard` shows a `RefreshCw` icon in place of the calendar icon for recurring items.

### Activity feed

`src/lib/supabase/activity.ts` fetches items created or completed within the last 14 days across all spaces in the family. The `created_by` column on `items` is auto-stamped by the `set_item_created_by_trigger` trigger (sets `auth.uid()` on each INSERT). `useActivityFeed` merges the raw items with the family member list in JS to resolve actor names, then produces a sorted `ActivityEvent[]` shown in `ActivitySheet`.

### Code style

- **Prettier**: `semi: false`, `singleQuote: true`, `trailingComma: 'all'`
- **TypeScript**: strict mode, `noUnusedLocals`, `noUnusedParameters`
- **Components**: named exports, props typed inline
- **Path alias**: `#/` maps to `src/` (configured in `package.json` imports and `tsconfig.json`)

---

## 10. Deployment

The app is a client-side Vite/React SPA. Any static host works.

### Netlify / Vercel

1. Connect the repo.
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Supabase — update redirect URIs

After deploying, add your production URL to the **Authorised redirect URIs** in Google Cloud Console:

```
https://your-app.vercel.app
```

And add it in Supabase under **Authentication → URL Configuration → Redirect URLs**.

---

## 11. Troubleshooting

### "Invalid login" / OAuth error after sign-in

- Check that the redirect URI in Google Cloud Console exactly matches the Supabase callback URL (including no trailing slash).
- Check that your email is in the **Test users** list in Google Cloud Console.
- Check that the Google provider is enabled in Supabase **Authentication → Providers**.

### Calendar events not appearing in Google Calendar

- Confirm the Calendar ID in Settings matches the one in Google Calendar → Settings → Integrate calendar.
- Check the browser console for a 401 or 403 error from the Calendar API. This usually means the OAuth token has expired — sign out and sign back in.
- Make sure the `https://www.googleapis.com/auth/calendar.events` scope is listed in the Supabase Google provider scopes field.

### Family members not showing / only one member appears

- The `profiles` table must exist and be populated. Profiles are created automatically when `find_or_create_family` is called on login. If you have users that pre-date this setup, backfill them:
  ```sql
  insert into profiles (id, email, name, avatar_url)
  select id, email,
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'avatar_url'
  from auth.users
  on conflict (id) do nothing;
  ```
- Check `user_families` has both a FK to `auth.users` AND a second FK to `profiles` (`user_families_profile_fkey`). PostgREST needs the `profiles` FK to resolve the member list join.
- RLS helper functions (`is_family_member`, `is_family_owner`, `item_is_family_member`) must return `boolean`, not `setof uuid` — PostgreSQL does not allow set-returning functions in policy expressions.

### Items load but spaces are empty / vice versa

- Check all RLS policies were created (section 4.3). A missing policy silently returns empty arrays rather than an error.
- In the Supabase dashboard go to **Table Editor** and verify rows exist in the `spaces` and `items` tables.
- Check the grants in Part 3 of the setup script were run. Without explicit grants, all access is blocked before RLS is even evaluated — this manifests as empty results, not an error.

### App shows demo data after adding `.env`

- Vite reads `.env` at startup. Restart the dev server after adding or changing `.env`.

### TypeScript errors on `zod`

This project uses Zod v4. The API changed slightly from v3. Refer to the [Zod v4 migration guide](https://zod.dev) if you see type errors on schema methods.
