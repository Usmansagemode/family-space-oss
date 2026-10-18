-- Migration 0007: Security and integrity fixes (combined 0007–0011).
--
-- Changes:
--   1. Fix invites_update RLS — scope to family members only (was open to all authenticated users)
--   2. Drop get_plan_limits function — dead code replaced by plan_features DB table
--   3. Add trigger to prevent deletion of active system person spaces
--   4. Add BEFORE INSERT triggers for atomic sort_order assignment on spaces + categories
--   5. Add reassign_and_delete_category RPC for atomic category reassignment

do $migration$
begin
  if exists (select 1 from schema_migrations where version = '0007') then
    raise notice 'Migration 0007 already applied, skipping.';
    return;
  end if;

  -- ----------------------------------------------------------------
  -- 1. Fix invites_update RLS
  -- ----------------------------------------------------------------
  drop policy if exists "invites_update" on invites;

  create policy "invites_update" on invites
    for update to authenticated using (is_family_member(family_id)) with check (true);

  -- ----------------------------------------------------------------
  -- 2. Drop dead get_plan_limits function
  -- ----------------------------------------------------------------
  revoke execute on function get_plan_limits(text) from authenticated;
  drop function if exists get_plan_limits(text);

  -- ----------------------------------------------------------------
  -- 3. System space delete guard
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

  drop trigger if exists trg_prevent_active_system_space_delete on spaces;

  create trigger trg_prevent_active_system_space_delete
    before delete on spaces
    for each row execute function prevent_active_system_space_delete();

  -- ----------------------------------------------------------------
  -- 4. Atomic sort_order triggers
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

  drop trigger if exists trg_spaces_sort_order on spaces;

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

  drop trigger if exists trg_categories_sort_order on categories;

  create trigger trg_categories_sort_order
    before insert on categories
    for each row execute function auto_sort_order_categories();

  -- ----------------------------------------------------------------
  -- 5. Atomic reassign_and_delete_category RPC
  -- ----------------------------------------------------------------
  create or replace function reassign_and_delete_category(p_old_id uuid, p_new_id uuid)
  returns void language plpgsql security definer set search_path = public as $$
  begin
    update expenses set category_id = p_new_id where category_id = p_old_id;
    delete from categories where id = p_old_id;
  end;
  $$;

  grant execute on function reassign_and_delete_category(uuid, uuid) to authenticated;

  -- ----------------------------------------------------------------

  insert into schema_migrations (version, name)
  values ('0007', 'security_and_integrity_fixes');

  raise notice 'Migration 0007 applied.';
end;
$migration$;
