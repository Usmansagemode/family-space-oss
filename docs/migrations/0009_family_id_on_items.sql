-- Migration 0009: Add family_id to items for direct RLS and calendar indexing
--
-- This migration denormalizes family_id onto items to avoid the
-- item_is_family_member() join on every RLS check and to enable an
-- efficient partial index for calendar queries.
--
-- DEPLOY ORDER (required):
--   1. Run this migration first (adds nullable column, backfills, sets NOT NULL).
--   2. Then deploy the new app code (which sends family_id on every INSERT).
--   Deploying the code before the migration causes errors: new code tries to
--   INSERT family_id into a column that does not yet exist.
--
-- Locking note: the backfill UPDATE and the subsequent SET NOT NULL both
-- take row-level write locks on every items row. This is acceptable for
-- family-space's current data volume (small, personal-use table). On a
-- large production table, use a batched backfill + NOT VALID FK instead.

do $migration$
declare
  v_orphan_count int;
  v_orphan_ids   text;
begin
  if exists (select 1 from schema_migrations where version = '0009') then
    raise notice 'Migration 0009 already applied, skipping.';
    return;
  end if;

  -- Step 1: Add as nullable (cheap — no constraint scan needed yet)
  alter table items add column if not exists
    family_id uuid references families(id) on delete cascade;

  -- Step 2: Backfill from parent space
  update items
  set family_id = spaces.family_id
  from spaces
  where spaces.id = items.space_id
    and items.family_id is null;

  -- Step 3: Guard — abort with diagnostic if any orphans remain.
  -- The only way this fires is if items.space_id was already orphaned
  -- (spaces.id ON DELETE CASCADE would normally have cleaned these up).
  select count(*),
         string_agg(id::text, ', ' order by id)
  into v_orphan_count, v_orphan_ids
  from items
  where family_id is null;

  if v_orphan_count > 0 then
    raise exception
      'Migration 0009 aborted: % item(s) have no resolvable family_id '
      '(orphaned space_id). Fix or delete these rows then re-run. IDs: %',
      v_orphan_count, v_orphan_ids;
  end if;

  -- Step 4: Lock in NOT NULL
  alter table items alter column family_id set not null;

  -- Step 5: Partial index for calendar queries
  create index if not exists idx_items_family_start_date
    on items (family_id, start_date)
    where start_date is not null and completed = false;

  -- Step 6: Replace items RLS policies to use family_id directly.
  -- Assumes is_family_member(uuid) is already granted to authenticated.
  drop policy if exists "items_select" on items;
  drop policy if exists "items_insert" on items;
  drop policy if exists "items_update" on items;
  drop policy if exists "items_delete" on items;

  create policy "items_select" on items
    for select to authenticated using (is_family_member(family_id));
  create policy "items_insert" on items
    for insert to authenticated with check (is_family_member(family_id));
  create policy "items_update" on items
    for update to authenticated
    using (is_family_member(family_id)) with check (is_family_member(family_id));
  create policy "items_delete" on items
    for delete to authenticated using (is_family_member(family_id));

  -- Step 7: Update activity log triggers to read family_id from NEW directly
  -- instead of joining back to spaces on every insert/update.
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

  -- Step 8: Refresh planner statistics so the new index is used immediately
  analyze items;

  insert into schema_migrations (version, name)
  values ('0009', 'family_id_on_items');

  raise notice 'Migration 0009 applied.';
end;
$migration$;
