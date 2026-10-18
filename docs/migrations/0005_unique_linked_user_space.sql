-- Migration 0005: prevent duplicate active person spaces per user per family
-- Caused by a race condition in find_or_create_family where two concurrent calls
-- could both pass the NOT EXISTS check before either insert committed.

do $migration$
begin
  if exists (select 1 from schema_migrations where version = '0005') then
    raise notice 'Migration 0005 already applied, skipping.';
    return;
  end if;

  create unique index if not exists spaces_family_linked_user_unique
    on spaces(family_id, linked_user_id)
    where linked_user_id is not null and deleted_at is null;

  insert into schema_migrations (version, name)
  values ('0005', 'unique_linked_user_space');

  raise notice 'Migration 0005 applied.';
end;
$migration$;
