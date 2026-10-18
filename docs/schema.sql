-- ================================================================
-- FAMILY SPACE — COMPLETE DATABASE SETUP
-- Safe to re-run: drops everything first, then rebuilds clean.
-- Run the entire script in one shot in Supabase SQL Editor.
-- ================================================================


-- ----------------------------------------------------------------
-- PART 1: DROP EVERYTHING (reverse dependency order)
-- ----------------------------------------------------------------

drop trigger if exists on_auth_user_created        on auth.users;

drop function if exists handle_new_user()                             cascade;
drop function if exists set_item_created_by()                         cascade;
drop function if exists check_split_group_limit()                     cascade;
drop function if exists prevent_active_system_space_delete()          cascade;
drop function if exists auto_sort_order_spaces()                      cascade;
drop function if exists auto_sort_order_categories()                  cascade;
drop function if exists find_or_create_family(uuid)                cascade;
drop function if exists accept_invite(uuid, uuid, uuid)            cascade;
drop function if exists reassign_and_delete_category(uuid, uuid)   cascade;
drop function if exists is_family_member(uuid)               cascade;
drop function if exists is_family_owner(uuid)                cascade;
drop function if exists item_is_family_member(uuid)          cascade;
drop function if exists split_participant_is_family_member(uuid) cascade;
drop function if exists split_share_is_family_member(uuid)   cascade;
drop function if exists update_updated_at()                  cascade;

drop table if exists schema_migrations        cascade;
drop table if exists activity_log             cascade;
drop table if exists admin_audit_log          cascade;
drop table if exists family_feature_overrides cascade;
drop table if exists plan_features            cascade;
drop table if exists split_shares      cascade;
drop table if exists split_settlements cascade;
drop table if exists split_expenses    cascade;
drop table if exists split_participants cascade;
drop table if exists split_groups      cascade;
drop table if exists tracker_entries  cascade;
drop table if exists trackers         cascade;
drop table if exists budgets          cascade;
drop table if exists income_entries          cascade;
drop table if exists expenses                cascade;
drop table if exists recurring_transactions  cascade;
drop table if exists items            cascade;
drop table if exists invites          cascade;
drop table if exists categories       cascade;
drop table if exists spaces           cascade;
drop table if exists user_families    cascade;
drop table if exists families         cascade;
drop table if exists profiles         cascade;


-- ----------------------------------------------------------------
-- PART 2: TABLES
-- ----------------------------------------------------------------

-- Tracks which migration files have been applied.
-- Migrations run on production; schema.sql is for fresh installs only.
create table schema_migrations (
  version     text primary key,          -- e.g. '0001'
  name        text not null,             -- human-readable description
  applied_at  timestamptz default now()
);

-- Mirrors auth.users — auto-populated via trigger on signup
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  avatar_url text,
  is_admin   boolean not null default false,
  banned_at  timestamptz,
  banned_by  uuid references auth.users(id) on delete set null,
  ban_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table families (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  plan                        text not null default 'free' check (plan in ('free', 'plus', 'pro')),
  currency                    text not null default 'USD',
  locale                      text not null default 'en-US',
  google_calendar_id          text,
  google_calendar_embed_url   text,
  google_refresh_token        text,
  stripe_customer_id          text,
  stripe_subscription_id      text,
  stripe_subscription_status  text,
  suspended_at                timestamptz,
  suspended_by                uuid references auth.users(id) on delete set null,
  suspend_reason              text,
  onboarding_completed_at     timestamptz,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

-- user_families: many-to-many users <-> families
-- The second FK to profiles is required for PostgREST to resolve
-- .select('user_id, role, profiles(name, email, avatar_url)') joins.
create table user_families (
  user_id   uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references families(id)   on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  primary key (user_id, family_id),
  constraint user_families_profile_fkey
    foreign key (user_id) references profiles(id) on delete cascade
);

-- Shareable invite links; token is the secret passed in the URL
create table invites (
  token       uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  created_by  uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

-- Plan feature matrix — one row per (plan, feature_key).
-- Managed exclusively by the admin app via service role.
create table plan_features (
  id          uuid primary key default gen_random_uuid(),
  plan        text not null check (plan in ('free', 'plus', 'pro')),
  feature_key text not null,
  value       jsonb not null,
  updated_at  timestamptz default now(),
  unique (plan, feature_key)
);

-- Per-family overrides that win over plan_features defaults.
-- Set by admin to grant/restrict features for specific families.
create table family_feature_overrides (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  feature_key text not null,
  value       jsonb not null default '{}',
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz default now(),
  created_at  timestamptz default now(),
  unique (family_id, feature_key)
);

-- Immutable audit trail for all admin actions.
create table admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  target_type text not null check (target_type in ('family', 'user', 'invite', 'feature_flag')),
  target_id   uuid,
  payload     jsonb not null default '{}',
  created_at  timestamptz default now()
);

-- Board columns: person (paid-by / chore assignee) or store (grocery list) or chore
create table spaces (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references families(id) on delete cascade,
  name               text not null,
  color              text not null default 'oklch(0.82 0.10 228)',
  type               text not null default 'store' check (type in ('person', 'store', 'chore')),
  sort_order         integer not null default 0,
  show_in_expenses   boolean not null default true,
  assigned_person_id uuid references spaces(id) on delete set null,
  -- person spaces auto-created on join are system spaces — cannot be deleted
  is_system          boolean not null default false,
  -- links a person space back to the family member it represents
  linked_user_id     uuid references auth.users(id) on delete set null,
  deleted_at         timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Prevent duplicate active person spaces for the same user in the same family
create unique index if not exists spaces_family_linked_user_unique
  on spaces(family_id, linked_user_id)
  where linked_user_id is not null and deleted_at is null;

-- Expense categories per family; soft-deleted to preserve history
create table categories (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families(id) on delete cascade,
  name       text not null,
  color      text,
  icon       text,
  sort_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------
-- RECURRING TRANSACTIONS (Pro feature)
-- Unified recurring template for both expenses and income.
-- direction = 'expense' → generates into expenses table
-- direction = 'income'  → generates into income_entries table
-- next_due_date advances after each generation.
-- ----------------------------------------------------------------

create table recurring_transactions (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,
  direction     text not null check (direction in ('expense', 'income')),
  description   text not null,
  amount        numeric(12, 2) not null,
  frequency     text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  start_date    date not null,
  next_due_date date not null,
  end_date      date,
  -- expense-only (null when direction = 'income')
  category_id   uuid references categories(id) on delete set null,
  location_id   uuid references spaces(id) on delete set null,
  paid_by_id    uuid references spaces(id) on delete set null,
  -- income-only (null when direction = 'expense')
  person_id     uuid references spaces(id) on delete set null,
  income_type   text check (income_type in ('salary', 'side_gig', 'freelance', 'business', 'rental', 'investment', 'other')),
  created_at    timestamptz default now()
);

-- All three FKs use ON DELETE SET NULL — deleting a space/category
-- never destroys expense records. UI shows "(Unknown)" for null FKs.
create table expenses (
  id                       uuid primary key default gen_random_uuid(),
  family_id                uuid not null references families(id) on delete cascade,
  amount                   numeric(12, 2) not null,
  category_id              uuid references categories(id) on delete set null,
  location_id              uuid references spaces(id) on delete set null,   -- type='store'
  paid_by_id               uuid references spaces(id) on delete set null,   -- type='person'
  date                     date not null,
  description              text,
  auto_generated           boolean not null default false,
  recurring_transaction_id uuid references recurring_transactions(id) on delete set null,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- Logged income entries (variable / actual amounts per date)
create table income_entries (
  id                       uuid primary key default gen_random_uuid(),
  family_id                uuid not null references families(id) on delete cascade,
  person_id                uuid references spaces(id) on delete set null,
  type                     text check (type in ('salary', 'side_gig', 'freelance', 'business', 'rental', 'investment', 'other')),
  amount                   numeric(12, 2) not null,
  date                     date not null,
  description              text,
  auto_generated           boolean not null default false,
  recurring_transaction_id uuid references recurring_transactions(id) on delete set null,
  created_at               timestamptz default now()
);

-- Budgets: null person_id = family-wide; null category_id = overall
create table budgets (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  person_id   uuid references spaces(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  amount      numeric(12, 2) not null,
  period      text not null check (period in ('monthly', 'yearly')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (family_id, person_id, category_id, period)
);

-- Board task / grocery cards
create table items (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  space_id        uuid not null references spaces(id) on delete cascade,
  title           text not null,
  description     text,
  quantity        text,
  recurrence      text,                          -- RRULE string e.g. 'FREQ=WEEKLY'
  sort_order      integer not null default 0,
  start_date      timestamptz,
  end_date        timestamptz,
  completed       boolean not null default false,
  completed_at    timestamptz,
  completed_by    uuid references auth.users(id) on delete set null,
  created_by      uuid references auth.users(id) on delete set null,
  google_event_id text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Trackers: debt / savings / loans
create table trackers (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  title           text not null,
  description     text,
  initial_balance numeric(12, 2) not null default 0,
  current_balance numeric(12, 2) not null default 0,
  color           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table tracker_entries (
  id         uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references trackers(id) on delete cascade,
  family_id  uuid not null references families(id) on delete cascade,
  date       date not null,
  description text,
  debit      numeric(12, 2) not null default 0,
  credit     numeric(12, 2) not null default 0,
  balance    numeric(12, 2) not null default 0,
  created_at timestamptz default now()
);


-- ----------------------------------------------------------------
-- SPLIT TRACKING (Splitwise-style)
-- Groups, participants, expenses, shares, and settlements.
-- Participants are freeform names — not linked to family members.
-- Deleting a group hard-deletes everything via cascade.
-- ----------------------------------------------------------------

create table split_groups (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table split_participants (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references split_groups(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);

create table split_expenses (
  id                    uuid primary key default gen_random_uuid(),
  group_id              uuid not null references split_groups(id) on delete cascade,
  family_id             uuid not null references families(id) on delete cascade,
  paid_by_participant_id uuid not null references split_participants(id) on delete cascade,
  amount                numeric(12, 2) not null,
  description           text,
  date                  date not null,
  split_type            text not null check (split_type in ('equal', 'shares', 'percentage')),
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Stores the resolved dollar amount owed per participant per expense.
-- Calculated by the app on save (equal/shares/percentage → always stored as $).
create table split_shares (
  id             uuid primary key default gen_random_uuid(),
  expense_id     uuid not null references split_expenses(id) on delete cascade,
  participant_id uuid not null references split_participants(id) on delete cascade,
  amount         numeric(12, 2) not null,
  created_at     timestamptz default now(),
  unique (expense_id, participant_id)
);

create table split_settlements (
  id                   uuid primary key default gen_random_uuid(),
  group_id             uuid not null references split_groups(id) on delete cascade,
  family_id            uuid not null references families(id) on delete cascade,
  from_participant_id  uuid not null references split_participants(id) on delete cascade,
  to_participant_id    uuid not null references split_participants(id) on delete cascade,
  amount               numeric(12, 2) not null,
  note                 text,
  date                 date not null,
  created_at           timestamptz default now()
);

-- Activity log: family-wide event stream
-- event_type: 'item.added' | 'item.completed' | 'expense.added' | 'expenses.imported' | 'member.joined'
-- payload:
--   item.*         → { title, space_name, space_color }
--   expense.added  → { amount, description? }
--   expenses.imported → { count }
--   member.joined  → { name }
create table activity_log (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families(id) on delete cascade,
  actor_id   uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz default now()
);


-- ----------------------------------------------------------------
-- PART 3: GRANTS
-- SQL-created tables start with no grants; RLS blocks everything
-- before policies are evaluated without these.
-- ----------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on profiles        to authenticated;
grant select, insert, update, delete on families        to authenticated;
grant select, insert, update, delete on user_families   to authenticated;
grant select, insert, update, delete on spaces          to authenticated;
grant select, insert, update, delete on categories      to authenticated;
grant select, insert, update, delete on recurring_transactions to authenticated;
grant select, insert, update, delete on expenses        to authenticated;
grant select, insert, update, delete on income_entries  to authenticated;
grant select, insert, update, delete on budgets         to authenticated;
grant select, insert, update, delete on items           to authenticated;
grant select, insert, update, delete on trackers        to authenticated;
grant select, insert, update, delete on tracker_entries to authenticated;
grant select                          on invites              to anon;
grant select, insert, update          on invites              to authenticated;
grant select, insert, update, delete  on split_groups         to authenticated;
grant select, insert, update, delete  on split_participants   to authenticated;
grant select, insert, update, delete  on split_expenses       to authenticated;
grant select, insert, update, delete  on split_shares         to authenticated;
grant select, insert, update, delete  on split_settlements    to authenticated;
grant select, insert                  on activity_log         to authenticated;
-- plan_features: web app needs SELECT to resolve useDynamicPlan
grant select                          on plan_features              to authenticated;
-- family_feature_overrides: web app needs SELECT to resolve per-family overrides
grant select                          on family_feature_overrides   to authenticated;
-- admin tables: service role only (no user grants needed — bypasses RLS)


-- ----------------------------------------------------------------
-- PART 4: UPDATED_AT TRIGGER
-- ----------------------------------------------------------------

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at        before update on profiles        for each row execute function update_updated_at();
create trigger trg_families_updated_at        before update on families        for each row execute function update_updated_at();
create trigger trg_spaces_updated_at          before update on spaces          for each row execute function update_updated_at();
create trigger trg_categories_updated_at      before update on categories      for each row execute function update_updated_at();
create trigger trg_expenses_updated_at        before update on expenses        for each row execute function update_updated_at();
create trigger trg_budgets_updated_at         before update on budgets         for each row execute function update_updated_at();
create trigger trg_items_updated_at           before update on items           for each row execute function update_updated_at();
create trigger trg_trackers_updated_at        before update on trackers        for each row execute function update_updated_at();
create trigger trg_split_groups_updated_at          before update on split_groups          for each row execute function update_updated_at();
create trigger trg_split_expenses_updated_at        before update on split_expenses        for each row execute function update_updated_at();
create trigger trg_plan_features_updated_at         before update on plan_features         for each row execute function update_updated_at();
create trigger trg_family_feature_overrides_updated_at before update on family_feature_overrides for each row execute function update_updated_at();


-- ----------------------------------------------------------------
-- PART 5: SIGNUP TRIGGER
-- Auto-creates a profile row whenever a user signs up.
-- SECURITY DEFINER + search_path = public is required — without it
-- the trigger runs in the auth schema and cannot find public.profiles.
-- ----------------------------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ----------------------------------------------------------------
-- PART 6: SET created_by TRIGGER ON ITEMS
-- Auto-stamps created_by = auth.uid() on every new item row.
-- ----------------------------------------------------------------

create or replace function set_item_created_by()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Only auto-stamp if not explicitly provided (allows seed scripts to set a value)
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger set_item_created_by_trigger
  before insert on items
  for each row execute function set_item_created_by();


-- ----------------------------------------------------------------
-- PART 6b: ACTIVITY LOG TRIGGERS FOR ITEMS
-- Write item.added / item.completed events to activity_log.
-- ----------------------------------------------------------------

create or replace function log_item_added()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_space_name  text;
  v_space_color text;
begin
  select name, color into v_space_name, v_space_color
  from spaces where id = NEW.space_id;

  insert into activity_log (family_id, actor_id, event_type, payload)
  values (
    NEW.family_id,
    auth.uid(),
    'item.added',
    jsonb_build_object('title', NEW.title, 'space_name', v_space_name, 'space_color', v_space_color)
  );
  return NEW;
end;
$$;

create trigger log_item_added_trigger
  after insert on items
  for each row execute function log_item_added();

create or replace function log_item_completed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_space_name  text;
  v_space_color text;
begin
  if NEW.completed = true and (OLD.completed = false or OLD.completed is null) then
    select name, color into v_space_name, v_space_color
    from spaces where id = NEW.space_id;

    insert into activity_log (family_id, actor_id, event_type, payload)
    values (
      NEW.family_id,
      auth.uid(),
      'item.completed',
      jsonb_build_object('title', NEW.title, 'space_name', v_space_name, 'space_color', v_space_color)
    );
  end if;
  return NEW;
end;
$$;

create trigger log_item_completed_trigger
  after update on items
  for each row execute function log_item_completed();


-- ----------------------------------------------------------------
-- PART 6c: SPLIT GROUP LIMIT TRIGGER
-- Enforces splitGroupLimit from plan_features / family_feature_overrides
-- before any INSERT into split_groups, so it cannot be bypassed via
-- the Supabase client directly.
-- ----------------------------------------------------------------

create or replace function check_split_group_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plan        text;
  v_limit_val   jsonb;
  v_group_limit int;
  v_group_count int;
begin
  select plan into v_plan from families where id = NEW.family_id;

  -- Per-family override wins over plan default
  select value into v_limit_val
  from family_feature_overrides
  where family_id = NEW.family_id and feature_key = 'splits.groupLimit';

  if v_limit_val is null then
    select value into v_limit_val
    from plan_features
    where plan = v_plan and feature_key = 'splits.groupLimit';
  end if;

  -- null value or missing row = unlimited
  if v_limit_val is null or (v_limit_val->>'limit') is null then
    return NEW;
  end if;

  v_group_limit := (v_limit_val->>'limit')::int;

  select count(*) into v_group_count
  from split_groups where family_id = NEW.family_id;

  if v_group_count >= v_group_limit then
    raise exception 'split_group_limit_reached: this family has reached the % split group limit for the % plan', v_group_limit, v_plan;
  end if;

  return NEW;
end;
$$;

create trigger check_split_group_limit_trigger
  before insert on split_groups
  for each row execute function check_split_group_limit();


-- ----------------------------------------------------------------
-- PART 6c: SYSTEM SPACE DELETE GUARD
-- Prevents hard-deleting a space that is still linked to an active member.
-- The correct flow is: remove the member (which unlinks the space), then
-- the space becomes a virtual member that can be archived or deleted.
-- ----------------------------------------------------------------

create or replace function prevent_active_system_space_delete()
returns trigger language plpgsql as $$
begin
  if OLD.is_system and OLD.linked_user_id is not null then
    raise exception 'active_system_space_protected: cannot delete a space linked to an active member';
  end if;
  return OLD;
end;
$$;

create trigger trg_prevent_active_system_space_delete
  before delete on spaces
  for each row execute function prevent_active_system_space_delete();


-- ----------------------------------------------------------------
-- PART 6d: AUTO SORT_ORDER ON INSERT
-- Atomically assigns sort_order = MAX(sort_order) + 1 per family on insert,
-- eliminating the TOCTOU race in client-side count-then-insert patterns.
-- ----------------------------------------------------------------

create or replace function auto_sort_order_spaces()
returns trigger language plpgsql as $$
begin
  select coalesce(max(sort_order), -1) + 1 into NEW.sort_order
  from spaces
  where family_id = NEW.family_id and deleted_at is null;
  return NEW;
end;
$$;

create trigger trg_spaces_sort_order
  before insert on spaces
  for each row execute function auto_sort_order_spaces();


create or replace function auto_sort_order_categories()
returns trigger language plpgsql as $$
begin
  select coalesce(max(sort_order), -1) + 1 into NEW.sort_order
  from categories
  where family_id = NEW.family_id and deleted_at is null;
  return NEW;
end;
$$;

create trigger trg_categories_sort_order
  before insert on categories
  for each row execute function auto_sort_order_categories();


-- ----------------------------------------------------------------
-- PART 7: RLS HELPER FUNCTIONS
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

-- DEPRECATED: items now have family_id; new RLS uses is_family_member(family_id) directly.
-- Retained for backward compatibility — do not wire new code to this function.
create or replace function item_is_family_member(sid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(
    select 1
    from spaces s
    join user_families uf on uf.family_id = s.family_id
    where s.id = sid and uf.user_id = auth.uid()
  )
$$;

-- For split_participants: checks membership via parent split_group
create or replace function split_participant_is_family_member(gid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(
    select 1
    from split_groups g
    join user_families uf on uf.family_id = g.family_id
    where g.id = gid and uf.user_id = auth.uid()
  )
$$;

-- For split_shares: checks membership via parent split_expense
create or replace function split_share_is_family_member(eid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(
    select 1
    from split_expenses e
    join user_families uf on uf.family_id = e.family_id
    where e.id = eid and uf.user_id = auth.uid()
  )
$$;

grant execute on function is_family_member(uuid)                    to authenticated;
grant execute on function is_family_owner(uuid)                     to authenticated;
grant execute on function item_is_family_member(uuid)               to authenticated;
grant execute on function split_participant_is_family_member(uuid)  to authenticated;
grant execute on function split_share_is_family_member(uuid)        to authenticated;


-- ----------------------------------------------------------------
-- PART 8: RPC FUNCTIONS
-- Called via supabase.rpc() — never as direct table operations.
-- ----------------------------------------------------------------

-- Called on every login. Upserts the profile and returns the user's
-- family, creating one (as owner) if they don't have one yet.
-- Also ensures a system person space exists for this member.
create or replace function find_or_create_family(p_user_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_family_id uuid;
  v_family    families%rowtype;
  v_name      text;
begin
  insert into profiles (id, name, email, avatar_url)
  select id, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'), email, raw_user_meta_data->>'avatar_url'
  from auth.users where id = p_user_id
  on conflict (id) do update
    set name = excluded.name, email = excluded.email, avatar_url = excluded.avatar_url;

  select family_id into v_family_id
  from user_families where user_id = p_user_id
  order by joined_at asc limit 1;

  if v_family_id is not null then
    -- Ensure system person space exists (idempotent)
    select coalesce(p.name, u.email) into v_name
    from auth.users u left join profiles p on p.id = u.id
    where u.id = p_user_id;

    insert into spaces (family_id, name, type, show_in_expenses, is_system, linked_user_id, sort_order)
    select v_family_id, coalesce(v_name, 'Member'), 'person', true, true, p_user_id,
           coalesce((select max(sort_order) + 1 from spaces where family_id = v_family_id), 0)
    where not exists (
      select 1 from spaces where family_id = v_family_id and linked_user_id = p_user_id and type = 'person'
    );

    select * into v_family from families where id = v_family_id;
    return row_to_json(v_family);
  end if;

  insert into families (name) values ('Our Family') returning * into v_family;
  insert into user_families (user_id, family_id, role) values (p_user_id, v_family.id, 'owner');

  -- Create owner's system person space
  select coalesce(p.name, u.email) into v_name
  from auth.users u left join profiles p on p.id = u.id
  where u.id = p_user_id;

  insert into spaces (family_id, name, type, show_in_expenses, is_system, linked_user_id, sort_order)
  values (v_family.id, coalesce(v_name, 'Owner'), 'person', true, true, p_user_id, 0);

  -- Seed default categories for new families (pastel CHART_COLORS palette)
  insert into categories (family_id, name, color, icon, sort_order) values
    (v_family.id, 'Grocery',   'oklch(0.82 0.10 152)', 'shopping-cart', 0),
    (v_family.id, 'Takeout',   'oklch(0.82 0.10 22)',  'utensils',      1),
    (v_family.id, 'Shopping',  'oklch(0.82 0.10 308)', 'shirt',         2),
    (v_family.id, 'Travel',    'oklch(0.82 0.10 228)', 'plane',         3),
    (v_family.id, 'Utilities', 'oklch(0.84 0.11 88)',  'zap',           4),
    (v_family.id, 'Car',       'oklch(0.82 0.10 188)', 'car',           5),
    (v_family.id, 'Rent',      'oklch(0.82 0.10 50)',  'home',          6),
    (v_family.id, 'Gifts',     'oklch(0.82 0.10 345)', 'gift',          7),
    (v_family.id, 'Misc',      'oklch(0.82 0.05 270)', 'circle-help',   8);

  return row_to_json(v_family);
end;
$$;

-- Called when a user accepts a family invite link.
create or replace function accept_invite(p_token uuid, p_user_id uuid, p_family_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_name         text;
  v_plan         text;
  v_member_count int;
  v_limit_val    jsonb;
  v_member_limit int;
begin
  -- Enforce member limits — reads from plan_features/family_feature_overrides
  -- so admin changes take effect immediately without a code deploy.
  select plan into v_plan from families where id = p_family_id;

  -- Per-family override wins over plan default
  select value into v_limit_val
  from family_feature_overrides
  where family_id = p_family_id and feature_key = 'members.limit';

  if v_limit_val is null then
    select value into v_limit_val
    from plan_features
    where plan = v_plan and feature_key = 'members.limit';
  end if;

  -- null value or missing row = unlimited
  if v_limit_val is not null and (v_limit_val->>'limit') is not null then
    v_member_limit := (v_limit_val->>'limit')::int;

    select count(*) into v_member_count
    from user_families where family_id = p_family_id;

    if v_member_count >= v_member_limit then
      raise exception 'member_limit_reached: this family has reached the % member limit for the % plan', v_member_limit, v_plan;
    end if;
  end if;
  insert into profiles (id, name, email, avatar_url)
  select id, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'), email, raw_user_meta_data->>'avatar_url'
  from auth.users where id = p_user_id
  on conflict (id) do update
    set name = excluded.name, email = excluded.email, avatar_url = excluded.avatar_url;

  -- Delete solo families auto-created on signup (user is the only member)
  delete from families
  where id in (
    select uf.family_id from user_families uf
    where uf.user_id = p_user_id
      and uf.family_id != p_family_id
      and (select count(*) from user_families where family_id = uf.family_id) = 1
  );

  delete from user_families where user_id = p_user_id and family_id != p_family_id;

  insert into user_families (user_id, family_id, role)
  values (p_user_id, p_family_id, 'member')
  on conflict (user_id, family_id) do nothing;

  -- Create system person space for the new member (idempotent)
  select coalesce(p.name, u.email) into v_name
  from auth.users u left join profiles p on p.id = u.id
  where u.id = p_user_id;

  insert into spaces (family_id, name, type, show_in_expenses, is_system, linked_user_id, sort_order)
  select p_family_id, coalesce(v_name, 'Member'), 'person', true, true, p_user_id,
         coalesce((select max(sort_order) + 1 from spaces where family_id = p_family_id), 0)
  where not exists (
    select 1 from spaces where family_id = p_family_id and linked_user_id = p_user_id and type = 'person'
  );

  update invites set accepted_at = now() where token = p_token;
end;
$$;

grant execute on function find_or_create_family(uuid)     to authenticated;
grant execute on function accept_invite(uuid, uuid, uuid) to authenticated;

-- Atomically reassign all expenses from one category to another, then hard-delete
-- the old category. Runs as a single transaction to prevent partial failures.
create or replace function reassign_and_delete_category(p_old_id uuid, p_new_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update expenses set category_id = p_new_id where category_id = p_old_id;
  delete from categories where id = p_old_id;
end;
$$;

grant execute on function reassign_and_delete_category(uuid, uuid) to authenticated;


-- ----------------------------------------------------------------
-- PART 9: ROW LEVEL SECURITY
-- ----------------------------------------------------------------

alter table profiles        enable row level security;
alter table families        enable row level security;
alter table user_families   enable row level security;
alter table invites         enable row level security;
alter table spaces          enable row level security;
alter table categories      enable row level security;
alter table expenses        enable row level security;
alter table income_entries  enable row level security;
alter table budgets         enable row level security;
alter table items           enable row level security;
alter table trackers             enable row level security;
alter table tracker_entries      enable row level security;
alter table split_groups              enable row level security;
alter table split_participants        enable row level security;
alter table split_expenses            enable row level security;
alter table split_shares              enable row level security;
alter table split_settlements         enable row level security;
alter table plan_features             enable row level security;
alter table family_feature_overrides  enable row level security;
alter table admin_audit_log           enable row level security;


-- ----------------------------------------------------------------
-- PART 10: POLICIES
-- INSERT on families/user_families goes through SECURITY DEFINER
-- RPCs (find_or_create_family, accept_invite) — no direct insert policy needed.
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

-- invites
create policy "invites_select"  on invites for select using (true);
create policy "invites_insert"  on invites
  for insert to authenticated with check (is_family_member(family_id));
create policy "invites_update"  on invites
  for update to authenticated using (is_family_member(family_id)) with check (true);

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

-- categories
create policy "categories_select" on categories
  for select to authenticated using (is_family_member(family_id));
create policy "categories_insert" on categories
  for insert to authenticated with check (is_family_member(family_id));
create policy "categories_update" on categories
  for update to authenticated
  using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "categories_delete" on categories
  for delete to authenticated using (is_family_member(family_id));

-- recurring_transactions
alter table recurring_transactions enable row level security;
create policy "recurring_transactions_select" on recurring_transactions
  for select to authenticated using (is_family_member(family_id));
create policy "recurring_transactions_insert" on recurring_transactions
  for insert to authenticated with check (is_family_member(family_id));
create policy "recurring_transactions_update" on recurring_transactions
  for update to authenticated
  using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "recurring_transactions_delete" on recurring_transactions
  for delete to authenticated using (is_family_member(family_id));

-- expenses
create policy "expenses_select" on expenses
  for select to authenticated using (is_family_member(family_id));
create policy "expenses_insert" on expenses
  for insert to authenticated with check (is_family_member(family_id));
create policy "expenses_update" on expenses
  for update to authenticated
  using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "expenses_delete" on expenses
  for delete to authenticated using (is_family_member(family_id));


-- income_entries
create policy "income_entries_select" on income_entries
  for select to authenticated using (is_family_member(family_id));
create policy "income_entries_insert" on income_entries
  for insert to authenticated with check (is_family_member(family_id));
create policy "income_entries_update" on income_entries
  for update to authenticated
  using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "income_entries_delete" on income_entries
  for delete to authenticated using (is_family_member(family_id));

-- budgets
create policy "budgets_select" on budgets
  for select to authenticated using (is_family_member(family_id));
create policy "budgets_insert" on budgets
  for insert to authenticated with check (is_family_member(family_id));
create policy "budgets_update" on budgets
  for update to authenticated
  using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "budgets_delete" on budgets
  for delete to authenticated using (is_family_member(family_id));

-- items
create policy "items_select" on items
  for select to authenticated using (is_family_member(family_id));
create policy "items_insert" on items
  for insert to authenticated with check (is_family_member(family_id));
create policy "items_update" on items
  for update to authenticated
  using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "items_delete" on items
  for delete to authenticated using (is_family_member(family_id));

-- trackers
create policy "trackers_select" on trackers
  for select to authenticated using (is_family_member(family_id));
create policy "trackers_insert" on trackers
  for insert to authenticated with check (is_family_member(family_id));
create policy "trackers_update" on trackers
  for update to authenticated
  using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "trackers_delete" on trackers
  for delete to authenticated using (is_family_owner(family_id));

-- tracker_entries
create policy "tracker_entries_select" on tracker_entries
  for select to authenticated using (is_family_member(family_id));
create policy "tracker_entries_insert" on tracker_entries
  for insert to authenticated with check (is_family_member(family_id));
create policy "tracker_entries_update" on tracker_entries
  for update to authenticated
  using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "tracker_entries_delete" on tracker_entries
  for delete to authenticated using (is_family_member(family_id));

-- split_groups
create policy "split_groups_select" on split_groups
  for select to authenticated using (is_family_member(family_id));
create policy "split_groups_insert" on split_groups
  for insert to authenticated with check (is_family_member(family_id));
create policy "split_groups_update" on split_groups
  for update to authenticated
  using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "split_groups_delete" on split_groups
  for delete to authenticated using (is_family_member(family_id));

-- split_participants (scoped via split_group)
create policy "split_participants_select" on split_participants
  for select to authenticated using (split_participant_is_family_member(group_id));
create policy "split_participants_insert" on split_participants
  for insert to authenticated with check (split_participant_is_family_member(group_id));
create policy "split_participants_update" on split_participants
  for update to authenticated
  using (split_participant_is_family_member(group_id)) with check (split_participant_is_family_member(group_id));
create policy "split_participants_delete" on split_participants
  for delete to authenticated using (split_participant_is_family_member(group_id));

-- split_expenses
create policy "split_expenses_select" on split_expenses
  for select to authenticated using (is_family_member(family_id));
create policy "split_expenses_insert" on split_expenses
  for insert to authenticated with check (is_family_member(family_id));
create policy "split_expenses_update" on split_expenses
  for update to authenticated
  using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "split_expenses_delete" on split_expenses
  for delete to authenticated using (is_family_member(family_id));

-- split_shares (scoped via split_expense)
create policy "split_shares_select" on split_shares
  for select to authenticated using (split_share_is_family_member(expense_id));
create policy "split_shares_insert" on split_shares
  for insert to authenticated with check (split_share_is_family_member(expense_id));
create policy "split_shares_update" on split_shares
  for update to authenticated
  using (split_share_is_family_member(expense_id)) with check (split_share_is_family_member(expense_id));
create policy "split_shares_delete" on split_shares
  for delete to authenticated using (split_share_is_family_member(expense_id));

-- split_settlements
create policy "split_settlements_select" on split_settlements
  for select to authenticated using (is_family_member(family_id));
create policy "split_settlements_insert" on split_settlements
  for insert to authenticated with check (is_family_member(family_id));
create policy "split_settlements_update" on split_settlements
  for update to authenticated
  using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy "split_settlements_delete" on split_settlements
  for delete to authenticated using (is_family_member(family_id));

-- activity_log
alter table activity_log enable row level security;
create policy "activity_log_select" on activity_log
  for select to authenticated using (is_family_member(family_id));
create policy "activity_log_insert" on activity_log
  for insert to authenticated with check (is_family_member(family_id));

-- plan_features — read-only for authenticated users; writes via service role only
create policy "plan_features_select" on plan_features
  for select to authenticated using (true);

-- family_feature_overrides — families can read their own overrides; writes via service role only
create policy "family_feature_overrides_select" on family_feature_overrides
  for select to authenticated using (is_family_member(family_id));

-- admin_audit_log — no direct user access; service role only


-- ----------------------------------------------------------------
-- PART 11: INDEXES
-- ----------------------------------------------------------------

-- expenses: monthly view
create index idx_expenses_family_date
  on expenses (family_id, date desc);

-- expenses: yearly analytics by month
create index idx_expenses_family_year_month
  on expenses (family_id, cast(extract(year from date) as int), cast(extract(month from date) as int));

-- expenses: category drilldown
create index idx_expenses_family_category
  on expenses (family_id, category_id)
  where category_id is not null;

-- expenses: paid_by split reports
create index idx_expenses_family_paid_by
  on expenses (family_id, paid_by_id)
  where paid_by_id is not null;

-- expenses: location reports
create index idx_expenses_family_location
  on expenses (family_id, location_id)
  where location_id is not null;

-- spaces: board fetch (active, ordered)
create index idx_spaces_family_type_order
  on spaces (family_id, type, sort_order)
  where deleted_at is null;

-- spaces: expense picker dropdowns
create index idx_spaces_expense_picker
  on spaces (family_id, type, show_in_expenses)
  where deleted_at is null and show_in_expenses = true;

-- categories: picker + chart (active only)
create index idx_categories_family_active
  on categories (family_id, sort_order)
  where deleted_at is null;

-- items: active board cards
create index idx_items_space_active
  on items (space_id, sort_order)
  where completed = false;

-- items: completed history (most recent first)
create index idx_items_space_completed
  on items (space_id, completed_at desc)
  where completed = true;

-- items: activity feed (recent items across spaces)
create index idx_items_space_recent
  on items (space_id, created_at desc);

-- items: calendar view (family-scoped, scheduled, incomplete)
create index idx_items_family_start_date
  on items (family_id, start_date)
  where start_date is not null and completed = false;

-- recurring_transactions: family list + due-date sweep
create index idx_recurring_transactions_family
  on recurring_transactions (family_id, created_at desc);
create index idx_recurring_transactions_due
  on recurring_transactions (family_id, next_due_date);

-- items: recurring job
create index idx_items_recurring
  on items (space_id, recurrence)
  where recurrence is not null and completed = false;

-- income entries: date range
create index idx_income_entries_family_date
  on income_entries (family_id, date desc);

-- tracker entries: history
create index idx_tracker_entries_tracker_date
  on tracker_entries (tracker_id, date desc);

-- user_families: user → their families
create index idx_user_families_user
  on user_families (user_id);

-- split_groups: family's groups
create index idx_split_groups_family
  on split_groups (family_id, created_at desc);

-- split_participants: all participants in a group
create index idx_split_participants_group
  on split_participants (group_id);

-- split_expenses: group expense list (most recent first)
create index idx_split_expenses_group_date
  on split_expenses (group_id, date desc);

-- split_shares: shares per expense (for balance calc)
create index idx_split_shares_expense
  on split_shares (expense_id);

-- split_shares: all expenses a participant is involved in
create index idx_split_shares_participant
  on split_shares (participant_id);

-- split_settlements: settlement history per group
create index idx_split_settlements_group_date
  on split_settlements (group_id, date desc);

-- activity_log: family feed (newest first)
create index idx_activity_log_family_recent
  on activity_log (family_id, created_at desc);

-- ----------------------------------------------------------------
-- PART 12: STORAGE
-- ----------------------------------------------------------------

-- Avatars bucket (public, 200 KB limit, images only)
-- NOTE: Supabase storage buckets cannot be created via SQL.
-- Run this once in Supabase Dashboard → Storage → New bucket:
--   Name: avatars
--   Public: true
--   Max file size: 204800 (200 KB)
--   Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Then apply the RLS policies below in SQL Editor:

-- Drop existing policies if re-running
drop policy if exists "avatars_insert" on storage.objects;
drop policy if exists "avatars_update" on storage.objects;
drop policy if exists "avatars_select" on storage.objects;

-- Users can upload into their own folder (avatars/{user_id}/*)
create policy "avatars_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can overwrite their own avatar
create policy "avatars_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can read avatars (public bucket, but explicit policy is best practice)
create policy "avatars_select"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

-- ----------------------------------------------------------------
-- PART 13: SEED — plan_features defaults
-- 5 features × 3 plans = 15 rows.
-- These are the baseline values; the admin panel can update them
-- at any time via the feature-flags UI (upsert with onConflict).
-- ----------------------------------------------------------------

insert into plan_features (plan, feature_key, value) values
  -- free
  ('free', 'members.limit',       '{"limit": 3}'),
  ('free', 'splits.groupLimit',   '{"limit": 1}'),
  ('free', 'charts',              '{"enabled": false}'),
  ('free', 'charts.export',       '{"enabled": false}'),
  ('free', 'import.ai',           '{"enabled": false}'),
  ('free', 'expenses.duplicates', '{"enabled": false}'),
  -- plus
  ('plus', 'members.limit',       '{"limit": 5}'),
  ('plus', 'splits.groupLimit',   '{"limit": null}'),
  ('plus', 'charts',              '{"enabled": true}'),
  ('plus', 'charts.export',       '{"enabled": true}'),
  ('plus', 'import.ai',           '{"enabled": false}'),
  ('plus', 'expenses.duplicates', '{"enabled": true}'),
  -- pro
  ('pro',  'members.limit',       '{"limit": null}'),
  ('pro',  'splits.groupLimit',   '{"limit": null}'),
  ('pro',  'charts',              '{"enabled": true}'),
  ('pro',  'charts.export',       '{"enabled": true}'),
  ('pro',  'import.ai',           '{"enabled": true}'),
  ('pro',  'expenses.duplicates', '{"enabled": true}')
on conflict (plan, feature_key) do nothing;
