-- Migration 0002: Fix set_item_created_by trigger to not override explicit values
-- Previously always overwrote created_by with auth.uid(), even when a value
-- was explicitly provided (e.g. seed scripts). Now only sets it when null.

do $migration$
begin
  if exists (select 1 from schema_migrations where version = '0002') then
    raise notice 'Migration 0002 already applied, skipping.';
    return;
  end if;

  create or replace function set_item_created_by()
  returns trigger language plpgsql security definer set search_path = public as $$
  begin
    if new.created_by is null then
      new.created_by := auth.uid();
    end if;
    return new;
  end;
  $$;

  insert into schema_migrations (version, name)
  values ('0002', 'fix_item_created_by_trigger');

  raise notice 'Migration 0002 applied.';
end;
$migration$;
