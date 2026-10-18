-- ============================================================
-- Family Space — Demo Cleanup Script
-- Removes ALL demo data created by demo-seed.sql
-- ============================================================
--
-- Replace <<YOUR_DEMO_USER_ID>> with the same UUID used in demo-seed.sql
-- Run in Supabase SQL Editor (service role)
-- ============================================================

do $$
declare
  v_user_id   uuid := '5d84a45e-a4cc-4514-a5a3-79e14adca8ed'; -- <<YOUR_DEMO_USER_ID>>
  v_family_id uuid;
begin
  -- Find the demo family
  select family_id into v_family_id
  from user_families
  where user_id = v_user_id and role = 'owner'
  limit 1;

  if v_family_id is null then
    raise notice 'No family found for user %. Nothing deleted.', v_user_id;
    return;
  end if;

  -- Delete in dependency order
  -- items has no family_id — cascade via spaces (on delete cascade) handles it,
  -- but we delete spaces after, so explicitly remove items first via space lookup
  delete from activity_log    where family_id = v_family_id;
  delete from items where space_id in (select id from spaces where family_id = v_family_id);
  delete from expenses        where family_id = v_family_id;
  delete from categories      where family_id = v_family_id;
  delete from spaces          where family_id = v_family_id;
  delete from user_families   where family_id = v_family_id;
  delete from families        where id = v_family_id;

  raise notice 'Demo data deleted. Family ID was: %', v_family_id;
end $$;
