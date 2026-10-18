-- Migration 0003: Add server-side split group limit enforcement
-- Reads limit from plan_features / family_feature_overrides so admin
-- changes take effect immediately without a code deploy.

do $migration$
begin
  if exists (select 1 from schema_migrations where version = '0003') then
    raise notice 'Migration 0003 already applied, skipping.';
    return;
  end if;

  create or replace function check_split_group_limit()
  returns trigger language plpgsql security definer set search_path = public as $$
  declare
    v_plan        text;
    v_limit_val   jsonb;
    v_group_limit int;
    v_group_count int;
  begin
    select plan into v_plan from families where id = NEW.family_id;

    select value into v_limit_val
    from family_feature_overrides
    where family_id = NEW.family_id and feature_key = 'splitGroupLimit';

    if v_limit_val is null then
      select value into v_limit_val
      from plan_features
      where plan = v_plan and feature_key = 'splitGroupLimit';
    end if;

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

  drop trigger if exists check_split_group_limit_trigger on split_groups;
  create trigger check_split_group_limit_trigger
    before insert on split_groups
    for each row execute function check_split_group_limit();

  insert into schema_migrations (version, name)
  values ('0003', 'split_group_limit_trigger');

  raise notice 'Migration 0003 applied.';
end;
$migration$;
