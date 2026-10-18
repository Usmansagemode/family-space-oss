#!/usr/bin/env bash
# Copies one family from a hosted family-space database into a fresh
# Family Space instance, preserving row UUIDs.
#
#   migrate.sh --dry-run   full import inside a transaction, verify, ROLLBACK
#   migrate.sh --apply     same, COMMIT, then copy sign-in metadata and avatars
#   migrate.sh --post-only after an --apply that stopped during metadata/avatars:
#                          redo only that step (target must hold this family)
#
# Required environment:
#   SOURCE_DB_URL            family-space Postgres URL (only read; the session is read-only)
#   SOURCE_FAMILY_ID         uuid of the family to copy
#   TARGET_DB_URL            new instance Postgres URL
#   TARGET_API_URL           new instance API URL, e.g. https://<ref>.supabase.co
#   TARGET_SERVICE_ROLE_KEY  new instance service-role key (avatar upload, user metadata)
# Optional:
#   PSQL                     psql command (default: psql)
#   WORK_DIR                 where exports are written (default: a new temp dir, mode 700)
#
# See docs/migrating-from-family-space.md for the full runbook.
set -euo pipefail

MODE="${1:-}"
[[ "$MODE" == "--dry-run" || "$MODE" == "--apply" || "$MODE" == "--post-only" ]] \
  || { echo "usage: $0 --dry-run|--apply|--post-only" >&2; exit 2; }
for v in SOURCE_DB_URL SOURCE_FAMILY_ID TARGET_DB_URL TARGET_API_URL TARGET_SERVICE_ROLE_KEY; do
  [[ -n "${!v:-}" ]] || { echo "Missing $v" >&2; exit 2; }
done
[[ "$SOURCE_FAMILY_ID" =~ ^[0-9a-fA-F-]{36}$ ]] || { echo "SOURCE_FAMILY_ID is not a uuid" >&2; exit 2; }
command -v curl >/dev/null || { echo "curl is required" >&2; exit 2; }

read -r -a PSQL_CMD <<< "${PSQL:-psql}"
umask 077
WORK="${WORK_DIR:-$(mktemp -d)}"
mkdir -p "$WORK"
chmod 700 "$WORK"
FID="$SOURCE_FAMILY_ID"

say() { printf '\n==> %s\n' "$*"; }
die() { printf 'ABORT: %s\n' "$*" >&2; exit 1; }
# Pinned formatting so date/time text never depends on role-level settings
FMT='-c datestyle=iso -c timezone=UTC -c intervalstyle=postgres'
# The source session refuses writes; every source statement goes through src().
src() { PGOPTIONS="-c default_transaction_read_only=on $FMT" "${PSQL_CMD[@]}" "$SOURCE_DB_URL" -X -q -At -v ON_ERROR_STOP=1 "$@"; }
tgt() { PGOPTIONS="$FMT" "${PSQL_CMD[@]}" "$TARGET_DB_URL" -X -q -At -v ON_ERROR_STOP=1 "$@"; }

# table | source row filter | user-referencing columns (! = required: NOT NULL makes the import abort if unmapped)
# Order respects foreign keys.
TABLES=(
  "families|id = '$FID'|"
  "user_families|family_id = '$FID'|!user_id"
  "spaces|family_id = '$FID'|linked_user_id"
  "categories|family_id = '$FID'|"
  "recurring_transactions|family_id = '$FID'|"
  "expenses|family_id = '$FID'|"
  "income_entries|family_id = '$FID'|"
  "budgets|family_id = '$FID'|"
  "items|family_id = '$FID'|created_by completed_by"
  "trackers|family_id = '$FID'|"
  "tracker_entries|family_id = '$FID'|"
  "split_groups|family_id = '$FID'|"
  "split_participants|group_id in (select id from public.split_groups where family_id = '$FID')|"
  "split_expenses|family_id = '$FID'|"
  "split_shares|expense_id in (select id from public.split_expenses where family_id = '$FID')|"
  "split_settlements|family_id = '$FID'|"
  "activity_log|family_id = '$FID'|actor_id"
)
# Source tables that hold family or user data but have no place in the new app
IGNORED_TABLES="invites plan_features family_feature_overrides admin_audit_log schema_migrations profiles"
# Every user-referencing column the import knows how to remap (profiles.id is handled separately)
KNOWN_USER_COLS="user_families.user_id spaces.linked_user_id items.created_by items.completed_by activity_log.actor_id profiles.id"

# ── 1. Live source schema check ───────────────────────────────────────────────
say "Checking the live source schema"
# PGOPTIONS only reaches the server on a direct or session-pooler connection
[[ "$(src -c 'show default_transaction_read_only')" == "on" ]] \
  || die "The source session is not read-only. Use a direct or session-pooler (port 5432) URL for SOURCE_DB_URL."
[[ "$(src -c "select count(*) from public.families where id = '$FID'")" == "1" ]] || die "Family $FID not found in source."

known_tables=" $IGNORED_TABLES "
for t in "${TABLES[@]}"; do known_tables+="${t%%|*} "; done
unknown=""
while IFS= read -r t; do
  [[ -z "$t" || "$known_tables" == *" $t "* ]] || unknown+=" $t"
done < <(src -c "
  select c.relname from pg_class c join pg_attribute a on a.attrelid = c.oid
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and a.attname = 'family_id' and not a.attisdropped
  union
  select k.conrelid::regclass::text from pg_constraint k
  where k.contype = 'f' and k.connamespace = 'public'::regnamespace
    and (k.confrelid = 'auth.users'::regclass
         or k.confrelid::regclass::text in ($(for t in "${TABLES[@]}"; do printf "'%s'," "${t%%|*}"; done | sed 's/,$//')))")
[[ -z "$unknown" ]] || die "Source has family/user tables this script does not handle:$unknown"

unknown=""
while IFS= read -r col; do
  [[ -z "$col" || " $KNOWN_USER_COLS " == *" $col "* || " $IGNORED_TABLES " == *" ${col%%.*} "* ]] && continue
  # A column the new schema dropped (e.g. families.suspended_by) is not copied at all
  [[ "$(tgt -c "select count(*) from information_schema.columns where table_schema = 'public'
                and table_name = '${col%%.*}' and column_name = '${col#*.}'")" == "0" ]] && continue
  unknown+=" $col"
done < <(src -c "
  select distinct k.conrelid::regclass::text || '.' || a.attname
  from pg_constraint k join pg_attribute a on a.attrelid = k.conrelid and a.attnum = any(k.conkey)
  where k.contype = 'f' and k.connamespace = 'public'::regnamespace
    and k.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)")
[[ -z "$unknown" ]] || die "Source has user-referencing columns this script does not remap:$unknown"

# ── 2. Target must be empty ───────────────────────────────────────────────────
say "Checking the target"
if [[ "$MODE" == "--post-only" ]]; then
  [[ "$(tgt -c "select string_agg(id::text, ',') from public.families")" == "$FID" ]] \
    || die "--post-only needs a target whose only family is $FID (run --apply first)."
else
  [[ "$(tgt -c "select count(*) from public.families")" == "0" ]] \
    || die "Target already has a family. Migrate only into a fresh instance where nobody has signed in."
  [[ "$(tgt -c "select count(*) from public.user_families")" == "0" ]] || die "Target has memberships."
fi

# ── 3. Users: map by email ────────────────────────────────────────────────────
say "Mapping users by email"
ref_sql="select user_id from public.user_families where family_id = '$FID'
  union select linked_user_id from public.spaces where family_id = '$FID'
  union select created_by from public.items where family_id = '$FID'
  union select completed_by from public.items where family_id = '$FID'
  union select actor_id from public.activity_log where family_id = '$FID'"
src -c "copy (select u.id, lower(u.email),
                     u.id in (select user_id from public.user_families where family_id = '$FID')
              from auth.users u where u.id in ($ref_sql)) to stdout with (format csv)" > "$WORK/src_users.csv"
tgt -c "copy (select id, lower(email) from auth.users where email is not null) to stdout with (format csv)" > "$WORK/tgt_users.csv"

: > "$WORK/map.csv"
missing_members="" nulled=""
while IFS=, read -r sid email member; do
  did="$(awk -F, -v e="$email" '$2 == e { print $1; exit }' "$WORK/tgt_users.csv")"
  if [[ -n "$did" ]]; then
    printf '%s,%s\n' "$sid" "$did" >> "$WORK/map.csv"
    echo "  matched  $email"
  elif [[ "$member" == "t" ]]; then
    missing_members+=" $email"
  else
    nulled+=" $email"
  fi
done < "$WORK/src_users.csv"
dups="$(cut -d, -f2 "$WORK/map.csv" | sort | uniq -d)"
[[ -z "$dups" ]] || die "Two source users map to the same target account: $dups"
[[ -z "$missing_members" ]] || die "Create these members in the target first (Authentication → Users, Auto Confirm):$missing_members"
[[ -z "$nulled" ]] && nulled=" (none)"
echo "  Former users with no target account (their references become NULL, as ON DELETE SET NULL would):$nulled"

members_sql="select user_id from public.user_families where family_id = '$FID'"
# id <TAB> {"user_metadata": {...}} <TAB> profiles.avatar_url  (JSON and URLs contain no raw tabs)
src -F $'\t' -c "select u.id,
         json_build_object('user_metadata', json_strip_nulls(json_build_object(
           'full_name', u.raw_user_meta_data->>'full_name', 'name', u.raw_user_meta_data->>'name',
           'avatar_url', u.raw_user_meta_data->>'avatar_url'))),
         coalesce(p.avatar_url, '')
       from auth.users u left join public.profiles p on p.id = u.id
       where u.id in ($members_sql)" > "$WORK/meta.tsv"

if [[ "$MODE" != "--post-only" ]]; then
# ── 4. Export ─────────────────────────────────────────────────────────────────
say "Exporting from source"
cols_of() { "$1" -c "select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns
                     where table_schema = 'public' and table_name = '$2'"; }
for t in "${TABLES[@]}"; do
  IFS='|' read -r name filter _ <<< "$t"
  tcols="$(cols_of tgt "$name")" scols=",$(cols_of src "$name"),"
  [[ -n "$tcols" ]] || die "Target has no table $name."
  [[ "$scols" != ",," ]] || die "Source has no table $name."
  use="" dropped=""
  IFS=, read -r -a tc <<< "$tcols"
  for c in "${tc[@]}"; do [[ "$scols" == *",$c,"* ]] && use+="${use:+,}$c"; done
  IFS=, read -r -a sc <<< "${scols:1:${#scols}-2}"
  for c in "${sc[@]}"; do [[ ",$tcols," == *",$c,"* ]] || dropped+=" $c"; done
  printf -v "COLS_$name" '%s' "$use"
  # Text format escapes newlines and backslashes, so no data line can read as the \. terminator
  src -c "copy (select $use from public.$name where $filter) to stdout" > "$WORK/$name.tsv"
  printf -v "EXPECT_$name" '%s' "$(src -c "select count(*) from public.$name where $filter")"
  v="EXPECT_$name"; printf '  %-24s %6s rows%s\n' "$name" "${!v}" "${dropped:+  (dropped columns:$dropped)}"
done
src -c "copy (select p.id, p.name, p.avatar_url from public.profiles p where p.id in ($members_sql))
        to stdout" > "$WORK/profiles.tsv"

src -c "copy (select to_char(date, 'YYYY-MM'), sum(amount) from public.expenses where family_id = '$FID' group by 1 order by 1)
        to stdout with (format csv)" > "$WORK/expense_months.csv"

# ── 5. Build and run the import ───────────────────────────────────────────────
say "Importing (${MODE#--})"
SQL="$WORK/import.sql"
{
  echo "begin;"
  echo "create temp table _map (src uuid primary key, dst uuid not null) on commit drop;"
  echo "copy _map from stdin with (format csv);"; cat "$WORK/map.csv"; echo '\.'
  # Stop triggers from rewriting sort_order, stamping created_by, logging activity
  # or touching updated_at while rows are copied. FK checks stay on.
  for t in "${TABLES[@]}"; do echo "alter table public.${t%%|*} disable trigger user;"; done
  echo "alter table public.profiles disable trigger user;"
  # Profiles first (user_families references them): target rows get the source display name and avatar
  echo "create temp table _s_profiles (id uuid, name text, avatar_url text) on commit drop;"
  echo "copy _s_profiles from stdin;"; cat "$WORK/profiles.tsv"; echo '\.'
  echo "update _s_profiles s set id = m.dst from _map m where s.id = m.src;"
  echo "insert into public.profiles (id, name, email, avatar_url)
        select s.id, s.name, u.email, s.avatar_url from _s_profiles s join auth.users u on u.id = s.id
        on conflict (id) do update set name = excluded.name, avatar_url = excluded.avatar_url;"
  for t in "${TABLES[@]}"; do
    IFS='|' read -r name _ ucols <<< "$t"
    echo "create temp table _s_$name (like public.$name including defaults) on commit drop;"
    v="COLS_$name"; cols="${!v}"
    echo "copy _s_$name ($cols) from stdin;"; cat "$WORK/$name.tsv"; echo '\.'
    for uc in $ucols; do
      uc="${uc#!}"
      echo "update _s_$name s set $uc = m.dst from _map m where s.$uc = m.src;"
      echo "update _s_$name set $uc = null where $uc is not null and $uc not in (select dst from _map);"
    done
    # A person space stays linked only to a family member; otherwise it becomes a virtual member
    [[ "$name" == spaces ]] && echo "update _s_spaces set linked_user_id = null where linked_user_id not in (select user_id from _s_user_families);"
    echo "insert into public.$name ($cols) select $cols from _s_$name;"
  done
  for t in "${TABLES[@]}"; do echo "alter table public.${t%%|*} enable trigger user;"; done
  echo "alter table public.profiles enable trigger user;"
  # Verification: row counts per table and expense totals per month
  echo "create temp table _expect (tbl text, n bigint) on commit drop;"
  echo "copy _expect from stdin with (format csv);"
  for t in "${TABLES[@]}"; do name="${t%%|*}"; v="EXPECT_$name"; echo "$name,${!v}"; done; echo '\.'
  echo "create temp table _months (month text, total numeric) on commit drop;"
  echo "copy _months from stdin with (format csv);"; cat "$WORK/expense_months.csv"; echo '\.'
  echo "do \$v\$ declare r record; n bigint; bad text := ''; begin
    for r in select * from _expect loop
      execute format('select count(*) from public.%I', r.tbl) into n;
      if n <> r.n then bad := bad || format(' %s: source %s, target %s;', r.tbl, r.n, n); end if;
      raise notice 'verify % rows: source %, target %', rpad(r.tbl, 24), r.n, n;
    end loop;
    for r in select coalesce(s.month, t.month) as month, s.total as src, t.total as tgt
             from _months s full join (select to_char(date, 'YYYY-MM') as month, sum(amount) as total
                                       from public.expenses group by 1) t using (month)
             order by 1 loop
      if r.src is distinct from r.tgt then bad := bad || format(' expenses %s: source %s, target %s;', r.month, r.src, r.tgt); end if;
      raise notice 'verify expenses %: source %, target %', r.month, r.src, r.tgt;
    end loop;
    if bad <> '' then raise exception 'verification failed:%', bad; end if;
    raise notice 'verification passed';
  end \$v\$;"
  if [[ "$MODE" == "--apply" ]]; then echo "commit;"; else echo "rollback;"; fi
} > "$SQL"
if ! PGOPTIONS="$FMT" "${PSQL_CMD[@]}" "$TARGET_DB_URL" -X -q -v ON_ERROR_STOP=1 < "$SQL" > "$WORK/import.log" 2>&1; then
  grep -E 'NOTICE|ERROR|DETAIL' "$WORK/import.log" | sed 's/^.*NOTICE:  /  /' >&2
  die "Import failed and was rolled back; nothing was written to the target."
fi
sed -n 's/^.*NOTICE:  /  /p' "$WORK/import.log"
fi

# ── 6. User metadata and avatars ──────────────────────────────────────────────
# find_or_create_family() refreshes profiles.name/avatar_url from auth metadata
# on every sign-in, so the target users get the source metadata too.
# Keys stay out of argv; sb_secret_ keys are not JWTs, so they go in apikey only
api() {
  { printf 'header = "apikey: %s"\n' "$TARGET_SERVICE_ROLE_KEY"
    [[ "$TARGET_SERVICE_ROLE_KEY" == sb_* ]] || printf 'header = "Authorization: Bearer %s"\n' "$TARGET_SERVICE_ROLE_KEY"
  } | curl -sS --config - "$@"
}
say "User metadata and avatars"
# fd 3: psql/curl inside the loop must not swallow the rest of the file from stdin
while IFS=$'\t' read -r sid meta avatar <&3; do
  did="$(awk -F, -v s="$sid" '$1 == s { print $2; exit }' "$WORK/map.csv")"
  if [[ "$MODE" == "--dry-run" ]]; then
    # Probe the service key now so a bad key doesn't surface only after COMMIT
    code="$(api -o /dev/null -w '%{http_code}' "$TARGET_API_URL/auth/v1/admin/users/$did")" || code=000
    [[ "$code" == "200" ]] || die "TARGET_SERVICE_ROLE_KEY / TARGET_API_URL rejected (HTTP $code)."
    echo "  would set sign-in metadata for $did${avatar:+; avatar: $avatar}"
    continue
  fi
  code="$(api -o /dev/null -w '%{http_code}' -X PUT -H 'Content-Type: application/json' --data "$meta" "$TARGET_API_URL/auth/v1/admin/users/$did")" || code=000
  [[ "$code" == "200" ]] || echo "  WARN metadata for $did: HTTP $code"
  # Only uploaded avatars live in Storage; Google avatar URLs are kept as they are.
  if [[ "$avatar" == *"/storage/v1/object/public/avatars/"* ]]; then
    file="${avatar%%\?*}"; ext="${file##*.}"
    curl -sSf -o "$WORK/avatar" "$file" || { echo "  WARN could not download avatar for $did"; continue; }
    case "$ext" in png) ct=image/png ;; webp) ct=image/webp ;; *) ext=jpg; ct=image/jpeg ;; esac
    code="$(api -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: $ct" -H 'x-upsert: true' \
      --data-binary @"$WORK/avatar" "$TARGET_API_URL/storage/v1/object/avatars/$did/avatar.$ext")" || code=000
    [[ "$code" == "200" ]] || { echo "  WARN avatar upload for $did: HTTP $code"; continue; }
    new="$TARGET_API_URL/storage/v1/object/public/avatars/$did/avatar.$ext?t=$(date +%s)000"
    if tgt -v new="$new" -v did="$did" <<< "update public.profiles set avatar_url = :'new' where id = :'did';"; then
      echo "  copied avatar for $did"
    else
      echo "  WARN could not update avatar_url for $did"
    fi
  fi
done 3< "$WORK/meta.tsv"

say "Done (${MODE#--}). Exports are in $WORK; delete them when finished."
echo "Any WARN above: fix the cause and run $0 --post-only to redo metadata and avatars."
