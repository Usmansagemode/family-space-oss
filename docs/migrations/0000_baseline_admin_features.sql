-- Migration 0000: Baseline admin panel schema
-- Adds all admin-panel tables, columns, grants, triggers, and RLS policies
-- that production may be missing after the admin panel was introduced.
-- Fully idempotent — safe to re-run on any database state.
--
-- Run BEFORE migrations 0001–0004.
--
-- ----------------------------------------------------------------
-- STEP 1: Ensure schema_migrations table exists.
-- This must be outside the do-block because the version check below
-- queries it — if it doesn't exist yet, the query would fail.
-- ----------------------------------------------------------------

create table if not exists schema_migrations (
  version     text primary key,
  name        text not null,
  applied_at  timestamptz default now()
);

-- ----------------------------------------------------------------
-- STEP 2: Migration body (idempotent via version check)
-- ----------------------------------------------------------------

do $migration$
begin
  if exists (select 1 from schema_migrations where version = '0000') then
    raise notice 'Migration 0000 already applied, skipping.';
    return;
  end if;

  -- ---------------------------------------------------------------
  -- NEW TABLES
  -- ---------------------------------------------------------------

  -- Plan feature matrix
  create table if not exists plan_features (
    id          uuid primary key default gen_random_uuid(),
    plan        text not null check (plan in ('free', 'plus', 'pro')),
    feature_key text not null,
    value       jsonb not null,
    updated_at  timestamptz default now(),
    unique (plan, feature_key)
  );

  -- Per-family feature overrides (admin can grant/restrict per family)
  create table if not exists family_feature_overrides (
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

  -- Immutable admin audit trail
  create table if not exists admin_audit_log (
    id          uuid primary key default gen_random_uuid(),
    admin_id    uuid references auth.users(id) on delete set null,
    action      text not null,
    target_type text not null check (target_type in ('family', 'user', 'invite', 'feature_flag')),
    target_id   uuid,
    payload     jsonb not null default '{}',
    created_at  timestamptz default now()
  );

  -- ---------------------------------------------------------------
  -- NEW COLUMNS ON EXISTING TABLES
  -- ---------------------------------------------------------------

  -- profiles: admin flag + ban fields
  alter table profiles
    add column if not exists is_admin   boolean not null default false,
    add column if not exists banned_at  timestamptz,
    add column if not exists ban_reason text;

  -- profiles.banned_by FK (add column then constraint separately)
  alter table profiles
    add column if not exists banned_by uuid;

  begin
    alter table profiles
      add constraint profiles_banned_by_fkey
      foreign key (banned_by) references auth.users(id) on delete set null;
  exception when duplicate_object then null;
  end;

  -- families: suspension fields
  alter table families
    add column if not exists suspended_at     timestamptz,
    add column if not exists suspend_reason   text;

  alter table families
    add column if not exists suspended_by uuid;

  begin
    alter table families
      add constraint families_suspended_by_fkey
      foreign key (suspended_by) references auth.users(id) on delete set null;
  exception when duplicate_object then null;
  end;

  -- invites: track who created and who accepted
  alter table invites
    add column if not exists accepted_by uuid;

  begin
    alter table invites
      add constraint invites_accepted_by_fkey
      foreign key (accepted_by) references auth.users(id) on delete set null;
  exception when duplicate_object then null;
  end;

  alter table invites
    add column if not exists created_by uuid;

  begin
    alter table invites
      add constraint invites_created_by_fkey
      foreign key (created_by) references auth.users(id) on delete set null;
  exception when duplicate_object then null;
  end;

  -- ---------------------------------------------------------------
  -- GRANTS
  -- ---------------------------------------------------------------

  -- Web app reads plan_features and family_feature_overrides for useDynamicPlan
  grant select on plan_features             to authenticated;
  grant select on family_feature_overrides  to authenticated;
  -- admin tables: service role only (bypasses RLS — no user grant needed)

  -- ---------------------------------------------------------------
  -- UPDATED_AT TRIGGERS
  -- ---------------------------------------------------------------

  -- plan_features
  begin
    create trigger trg_plan_features_updated_at
      before update on plan_features
      for each row execute function update_updated_at();
  exception when duplicate_object then null;
  end;

  -- family_feature_overrides
  begin
    create trigger trg_family_feature_overrides_updated_at
      before update on family_feature_overrides
      for each row execute function update_updated_at();
  exception when duplicate_object then null;
  end;

  -- ---------------------------------------------------------------
  -- ROW LEVEL SECURITY
  -- ---------------------------------------------------------------

  -- Enable RLS on new tables (safe even if already enabled)
  alter table plan_features            enable row level security;
  alter table family_feature_overrides enable row level security;
  alter table admin_audit_log          enable row level security;

  -- plan_features: read-only for authenticated users; writes via service role only
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'plan_features' and policyname = 'plan_features_select'
  ) then
    create policy "plan_features_select" on plan_features
      for select to authenticated using (true);
  end if;

  -- family_feature_overrides: families can read their own overrides; writes via service role only
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'family_feature_overrides' and policyname = 'family_feature_overrides_select'
  ) then
    create policy "family_feature_overrides_select" on family_feature_overrides
      for select to authenticated using (is_family_member(family_id));
  end if;

  -- admin_audit_log: no direct user access; service role only
  -- (no policies needed — RLS blocks all, service role bypasses)

  -- ---------------------------------------------------------------
  -- SEED plan_features (idempotent — ON CONFLICT DO NOTHING)
  -- ---------------------------------------------------------------

  insert into plan_features (plan, feature_key, value) values
    ('free', 'memberLimit',      '{"limit": 3}'),
    ('free', 'splitGroupLimit',  '{"limit": 1}'),
    ('free', 'analytics',        '{"enabled": false}'),
    ('free', 'export',           '{"enabled": false}'),
    ('free', 'aiImport',         '{"enabled": false}'),
    ('plus', 'memberLimit',      '{"limit": 5}'),
    ('plus', 'splitGroupLimit',  '{"limit": null}'),
    ('plus', 'analytics',        '{"enabled": true}'),
    ('plus', 'export',           '{"enabled": true}'),
    ('plus', 'aiImport',         '{"enabled": false}'),
    ('pro',  'memberLimit',      '{"limit": null}'),
    ('pro',  'splitGroupLimit',  '{"limit": null}'),
    ('pro',  'analytics',        '{"enabled": true}'),
    ('pro',  'export',           '{"enabled": true}'),
    ('pro',  'aiImport',         '{"enabled": true}')
  on conflict (plan, feature_key) do nothing;

  -- ---------------------------------------------------------------
  -- DONE
  -- ---------------------------------------------------------------

  insert into schema_migrations (version, name)
  values ('0000', 'baseline_admin_features');

  raise notice 'Migration 0000 applied.';
end;
$migration$;
