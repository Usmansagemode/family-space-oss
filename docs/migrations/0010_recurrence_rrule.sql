-- Migration 0010: Migrate recurrence column from enum strings to RRULE format
--
-- Replaces the 4-value check constraint with free-form RRULE strings
-- (RFC 5545), enabling richer patterns like FREQ=WEEKLY;BYDAY=MO,TH
-- without future schema changes. Existing rows are backfilled.

do $migration$
begin
  if exists (select 1 from schema_migrations where version = '0010') then
    raise notice 'Migration 0010 already applied, skipping.';
    return;
  end if;

  -- Backfill enum values to RRULE format
  update items set recurrence = 'FREQ=DAILY'   where recurrence = 'daily';
  update items set recurrence = 'FREQ=WEEKLY'  where recurrence = 'weekly';
  update items set recurrence = 'FREQ=MONTHLY' where recurrence = 'monthly';
  update items set recurrence = 'FREQ=YEARLY'  where recurrence = 'yearly';

  -- Drop the check constraint that enforced the old enum
  alter table items drop constraint if exists items_recurrence_check;

  insert into schema_migrations (version, name)
  values ('0010', 'recurrence_rrule');

  raise notice 'Migration 0010 applied.';
end;
$migration$;
