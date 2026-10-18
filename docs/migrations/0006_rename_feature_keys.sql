-- Migration 0006: rename feature keys to dot-notation hierarchy + add expenses.duplicates
--
-- Old keys → new keys:
--   memberLimit      → members.limit
--   splitGroupLimit  → splits.groupLimit
--   analytics        → charts
--   export           → charts.export
--   aiImport         → import.ai
--
-- Also re-creates check_split_group_limit() and accept_invite() with updated key strings,
-- and adds the new expenses.duplicates feature flag.

do $migration$
begin
  if exists (select 1 from schema_migrations where version = '0006') then
    raise notice 'Migration 0006 already applied, skipping.';
    return;
  end if;

  -- ----------------------------------------------------------------
  -- 1. Rename feature keys in plan_features
  -- ----------------------------------------------------------------
  update plan_features set feature_key = 'members.limit'     where feature_key = 'memberLimit';
  update plan_features set feature_key = 'splits.groupLimit' where feature_key = 'splitGroupLimit';
  update plan_features set feature_key = 'charts'            where feature_key = 'analytics';
  update plan_features set feature_key = 'charts.export'     where feature_key = 'export';
  update plan_features set feature_key = 'import.ai'         where feature_key = 'aiImport';

  -- ----------------------------------------------------------------
  -- 2. Rename feature keys in family_feature_overrides (if any exist)
  -- ----------------------------------------------------------------
  update family_feature_overrides set feature_key = 'members.limit'     where feature_key = 'memberLimit';
  update family_feature_overrides set feature_key = 'splits.groupLimit' where feature_key = 'splitGroupLimit';
  update family_feature_overrides set feature_key = 'charts'            where feature_key = 'analytics';
  update family_feature_overrides set feature_key = 'charts.export'     where feature_key = 'export';
  update family_feature_overrides set feature_key = 'import.ai'         where feature_key = 'aiImport';

  -- ----------------------------------------------------------------
  -- 3. Add the new expenses.duplicates feature flag
  -- ----------------------------------------------------------------
  insert into plan_features (plan, feature_key, value) values
    ('free', 'expenses.duplicates', '{"enabled": false}'),
    ('plus', 'expenses.duplicates', '{"enabled": true}'),
    ('pro',  'expenses.duplicates', '{"enabled": true}')
  on conflict (plan, feature_key) do nothing;

  -- ----------------------------------------------------------------
  -- 4. Re-create check_split_group_limit() with updated key string
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

  -- ----------------------------------------------------------------
  -- 5. Re-create accept_invite() with updated key string
  -- ----------------------------------------------------------------
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

  insert into schema_migrations (version, name)
  values ('0006', 'rename_feature_keys');

  raise notice 'Migration 0006 applied.';
end;
$migration$;
