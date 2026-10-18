-- Migration 0004: Fix accept_invite to read memberLimit from DB
-- Previously hardcoded (free=3, plus=5) so admin overrides had no effect.
-- Now reads from plan_features / family_feature_overrides like all other gates.

do $migration$
begin
  if exists (select 1 from schema_migrations where version = '0004') then
    raise notice 'Migration 0004 already applied, skipping.';
    return;
  end if;

  create or replace function accept_invite(p_token uuid, p_user_id uuid, p_family_id uuid)
  returns void language plpgsql security definer set search_path = public as $$
  declare
    v_name         text;
    v_plan         text;
    v_member_count int;
    v_limit_val    jsonb;
    v_member_limit int;
  begin
    select plan into v_plan from families where id = p_family_id;

    select value into v_limit_val
    from family_feature_overrides
    where family_id = p_family_id and feature_key = 'memberLimit';

    if v_limit_val is null then
      select value into v_limit_val
      from plan_features
      where plan = v_plan and feature_key = 'memberLimit';
    end if;

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
  values ('0004', 'fix_accept_invite_member_limit');

  raise notice 'Migration 0004 applied.';
end;
$migration$;
