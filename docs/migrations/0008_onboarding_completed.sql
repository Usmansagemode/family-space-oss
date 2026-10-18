-- Migration 0008: add onboarding_completed_at to families
-- Controls whether a new user sees the post-signup onboarding wizard.
-- Existing families are marked as already onboarded so they skip it.

do $migration$
begin
  if exists (select 1 from schema_migrations where version = '0008') then
    raise notice 'Migration 0008 already applied, skipping.';
    return;
  end if;

  alter table families
    add column if not exists onboarding_completed_at timestamptz;

  -- All existing families have already seen (or don't need) the wizard
  update families
  set onboarding_completed_at = now()
  where onboarding_completed_at is null;

  insert into schema_migrations (version, name)
  values ('0008', 'onboarding_completed');

  raise notice 'Migration 0008 applied.';
end;
$migration$;
