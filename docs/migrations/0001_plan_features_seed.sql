-- Migration 0001: Seed plan_features with default gate values
-- Safe to re-run (ON CONFLICT DO NOTHING)

do $migration$
begin
  if exists (select 1 from schema_migrations where version = '0001') then
    raise notice 'Migration 0001 already applied, skipping.';
    return;
  end if;

  insert into plan_features (plan, feature_key, value) values
    ('free', 'memberLimit',      '{"limit": 3}'),
    ('free', 'splitGroupLimit',  '{"limit": 1}'),
    ('free', 'analytics',        '{"enabled": false}'),
    ('free', 'export',           '{"enabled": false}'),
    ('free', 'aiImport',         '{"enabled": false}'),
    ('plus', 'memberLimit',      '{"limit": 5}'),
    ('plus', 'splitGroupLimit',  '{"limit": null}'),
    ('plus', 'analytics',        '{"enabled": true}'),
    ('plus', 'export',           '{"enabled": true}'),
    ('plus', 'aiImport',         '{"enabled": false}'),
    ('pro',  'memberLimit',      '{"limit": null}'),
    ('pro',  'splitGroupLimit',  '{"limit": null}'),
    ('pro',  'analytics',        '{"enabled": true}'),
    ('pro',  'export',           '{"enabled": true}'),
    ('pro',  'aiImport',         '{"enabled": true}')
  on conflict (plan, feature_key) do nothing;

  insert into schema_migrations (version, name)
  values ('0001', 'plan_features_seed');

  raise notice 'Migration 0001 applied.';
end;
$migration$;
