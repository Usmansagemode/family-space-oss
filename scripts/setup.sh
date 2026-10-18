#!/usr/bin/env bash
# Stands up a Family Space instance: Supabase project + schema + auth config +
# avatars bucket + owner user + apps/web/.env, and optionally a Vercel deploy.
#
#   scripts/setup.sh           hosted Supabase project (create or link)
#   scripts/setup.sh --local   local Supabase stack in Docker (development)
#
# Safe to re-run: answers are kept in scripts/.setup.local (git-ignored, mode
# 600), the schema is applied only when the public schema has no tables, and
# existing users are left alone. Secrets are never printed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
umask 077

SUPABASE=(npx -y supabase@2.121.0)
VERCEL=(npx -y vercel@61.1.0)
STATE="scripts/.setup.local"
WEB_ENV="apps/web/.env"
case "${1:-}" in
  "") MODE="hosted" ;;
  --local) MODE="local" ;;
  *) echo "usage: $0 [--local]" >&2; exit 2 ;;
esac

# Cleanup on any exit: temp files, and the Vercel logout prompt if the CLI was used
TMP_PATHS=() VERCEL_USED=""
cleanup() {
  [[ ${#TMP_PATHS[@]} -gt 0 ]] && rm -rf "${TMP_PATHS[@]}"
  if [[ -n "$VERCEL_USED" ]] && yes_no "Log out of the Vercel CLI now?" y; then
    "${VERCEL[@]}" logout
  fi
}
trap cleanup EXIT

say() { printf '\n==> %s\n' "$*"; }
die() { printf 'Error: %s\n' "$*" >&2; exit 1; }
ask() { local v; read -r -p "$1${2:+ [$2]}: " v; printf '%s' "${v:-${2:-}}"; }
ask_secret() { local v; read -r -s -p "$1: " v; echo >&2; printf '%s' "$v"; }
# yes_no "Question?" y|n  (second argument is the default)
yes_no() { local v; read -r -p "$1 [$([[ $2 == y ]] && echo Y/n || echo y/N)]: " v; v="${v:-$2}"; [[ "$v" =~ ^[Yy] ]]; }

# key=value files: replace or append one key without touching the others.
# The state file is sourced by bash, so its values are shell-quoted (%q);
# .env values (URLs, JWTs) are written as-is for dotenv.
set_kv() {
  local file=$1 key=$2 val=$3 fmt=${4:-%s} tmp
  touch "$file"
  tmp="$(mktemp)"
  grep -v "^${key}=" "$file" > "$tmp" || true
  printf "%s=$fmt\n" "$key" "$val" >> "$tmp"
  mv "$tmp" "$file"
  chmod 600 "$file"
}
save() { set_kv "$STATE" "$1" "$2" %q; printf -v "$1" '%s' "$2"; }

# Reads one field from JSON on stdin: json_get '<js expression over d>'
# curl config lines for the Auth admin API (sb_secret_ keys are not JWTs: apikey only)
auth_headers() {
  printf 'header = "apikey: %s"\n' "$1"
  [[ "$1" == sb_* ]] || printf 'header = "Authorization: Bearer %s"\n' "$1"
}
json_get() { node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{const d=JSON.parse(s);const v=($1);process.stdout.write(v==null?'':String(v))})"; }

command -v node >/dev/null || die "Node.js 20+ is required."
command -v curl >/dev/null || die "curl is required."

PROJECT_REF="" DB_PASSWORD="" SITE_URL="" OWNER_EMAIL="" GOOGLE_CLIENT_ID="" GOOGLE_SECRET=""
# shellcheck disable=SC1090
[[ -f "$STATE" ]] && source "$STATE"

# ── 1. Supabase project ───────────────────────────────────────────────────────
if [[ "$MODE" == "local" ]]; then
  command -v docker >/dev/null || die "Docker is required for --local."
  [[ -n "$SITE_URL" ]] || save SITE_URL "http://localhost:3000"
  say "Starting the local Supabase stack (Docker)"
  SITE_URL="$SITE_URL" "${SUPABASE[@]}" start >/dev/null
  status_env="$("${SUPABASE[@]}" status -o env 2>/dev/null)"
  env_get() { printf '%s\n' "$status_env" | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p"; }
  API_URL="$(env_get API_URL)"
  ANON_KEY="$(env_get ANON_KEY)"
  SERVICE_KEY="$(env_get SERVICE_ROLE_KEY)"
  DB_TARGET=(--local)
else
  "${SUPABASE[@]}" projects list >/dev/null 2>&1 || { say "Log in to Supabase"; "${SUPABASE[@]}" login; }

  if [[ -z "$PROJECT_REF" ]]; then
    say "Supabase project"
    ref="$(ask "Existing project ref (leave blank to create a new project)")"
    if [[ -n "$ref" ]]; then
      save PROJECT_REF "$ref"
      save DB_PASSWORD "$(ask_secret "Database password for $ref")"
    else
      "${SUPABASE[@]}" orgs list
      org="$(ask "Organization ID")"
      name="$(ask "Project name" "family-space")"
      region="$(ask "Region" "us-east-1")"
      [[ -n "$DB_PASSWORD" ]] || save DB_PASSWORD "$(node -e "process.stdout.write(require('crypto').randomBytes(24).toString('base64url'))")"
      # shortcut: the CLI only takes the password as a flag, so it is briefly visible in `ps` on this machine
      ref="$("${SUPABASE[@]}" projects create "$name" --org-id "$org" --region "$region" \
        --db-password "$DB_PASSWORD" -o json | json_get 'd.id ?? d.ref')" || ref=""
      [[ -n "$ref" ]] || die "Could not read the new project's ref. If it was created, find it with
  npx supabase@2.121.0 projects list
and re-run, entering it as the existing ref (its password is kept in $STATE)."
      save PROJECT_REF "$ref"
    fi
  fi

  say "Waiting for project $PROJECT_REF to be ready"
  for _ in $(seq 1 60); do
    st="$("${SUPABASE[@]}" projects list -o json 2>/dev/null \
      | REF="$PROJECT_REF" json_get "(d.find(p => (p.id ?? p.ref) === process.env.REF) ?? {}).status")" || st=""
    [[ -n "$st" ]] || die "Project $PROJECT_REF is not in this account. Fix PROJECT_REF in $STATE or delete that line and re-run."
    [[ "$st" == "ACTIVE_HEALTHY" ]] && break
    sleep 10
  done
  [[ "$st" == "ACTIVE_HEALTHY" ]] || die "Project is not healthy yet (status: ${st:-unknown}). Re-run later."

  if ! SUPABASE_DB_PASSWORD="$DB_PASSWORD" "${SUPABASE[@]}" link --project-ref "$PROJECT_REF" >/dev/null; then
    save DB_PASSWORD ""
    die "Linking failed (wrong database password?). Re-run to enter it again."
  fi
  API_URL="https://$PROJECT_REF.supabase.co"
  keys="$("${SUPABASE[@]}" projects api-keys --project-ref "$PROJECT_REF" --reveal -o json)"
  # Legacy JWT keys when present, else the publishable/secret keys
  ANON_KEY="$(printf '%s' "$keys" | json_get "(d.find(k => k.name === 'anon') ?? d.find(k => k.type === 'publishable') ?? {}).api_key")"
  SERVICE_KEY="$(printf '%s' "$keys" | json_get "(d.find(k => k.name === 'service_role') ?? d.find(k => k.type === 'secret') ?? {}).api_key")"
  DB_TARGET=(--linked)
fi
[[ -n "$API_URL" && -n "$ANON_KEY" && -n "$SERVICE_KEY" ]] || die "Could not read the project's API keys."

# ── 2. Database schema ────────────────────────────────────────────────────────
# docs/schema.sql drops tables first, so it only ever runs on an empty public schema.
state="$("${SUPABASE[@]}" db query "${DB_TARGET[@]}" --output-format json \
  "select to_regclass('public.families') is not null as present,
          (select count(*) from pg_tables where schemaname = 'public') as tables" 2>/dev/null \
  | json_get 'd.rows[0].present + "," + d.rows[0].tables')"
if [[ "$state" == true,* ]]; then
  say "Schema already present; leaving the database untouched"
elif [[ "$state" != "false,0" ]]; then
  die "The database already has tables but no Family Space schema ($state). Use a new project."
else
  say "Applying docs/schema.sql"
  if [[ "$MODE" == "local" ]]; then
    # `db query --local` runs one prepared statement; psql in the db container runs the whole file
    docker exec -i supabase_db_family-space psql -U postgres -1 -v ON_ERROR_STOP=1 -q < docs/schema.sql >/dev/null
  else
    "${SUPABASE[@]}" db query --linked -f docs/schema.sql >/dev/null
  fi
fi

say "Creating the avatars storage bucket"
"${SUPABASE[@]}" seed buckets "${DB_TARGET[@]}" >/dev/null

# ── 3. Auth config (hosted only; the local stack reads supabase/config.toml) ──
if [[ "$MODE" == "hosted" ]]; then
  say "Auth settings"
  save SITE_URL "$(ask "App URL (where the web app will be served)" "${SITE_URL:-http://localhost:3000}")"
  if [[ -z "$GOOGLE_CLIENT_ID" ]]; then
    echo "Google sign-in needs an OAuth client (see docs/self-hosting.md). Leave blank to skip."
    save GOOGLE_CLIENT_ID "$(ask "Google OAuth client ID")"
    [[ -n "$GOOGLE_CLIENT_ID" ]] && save GOOGLE_SECRET "$(ask_secret "Google OAuth client secret")"
  fi

  push_auth() {
    local workdir="$ROOT"
    if [[ -z "$GOOGLE_CLIENT_ID" ]]; then
      # Push a copy with the Google provider switched off
      workdir="$(mktemp -d)"
      TMP_PATHS+=("$workdir")
      cp -R supabase "$workdir/"
      sed -i.bak '/^\[auth.external.google\]$/,/^enabled = /s/^enabled = true$/enabled = false/' \
        "$workdir/supabase/config.toml"
    fi
    SITE_URL="$SITE_URL" \
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
    SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET="$GOOGLE_SECRET" \
      "${SUPABASE[@]}" config push --project-ref "$PROJECT_REF" --workdir "$workdir"
  }
  say "Pushing auth config (sign-ups disabled, email/password + Google, redirect URLs)"
  push_auth
fi

# ── 4. apps/web/.env ──────────────────────────────────────────────────────────
say "Writing $WEB_ENV"
set_kv "$WEB_ENV" VITE_SUPABASE_URL "$API_URL"
set_kv "$WEB_ENV" VITE_SUPABASE_ANON_KEY "$ANON_KEY"
set_kv "$WEB_ENV" SUPABASE_SERVICE_ROLE_KEY "$SERVICE_KEY"

# ── 5. Owner user ─────────────────────────────────────────────────────────────
# Created auto-confirmed through the Auth admin API. The first user to sign in
# becomes the family owner and runs onboarding.
say "Owner account"
save OWNER_EMAIL "$(ask "Owner email (use the exact Google address to sign in with Google)" "$OWNER_EMAIL")"
pw="$(ask_secret "Owner password (leave blank for Google-only sign-in)")"
[[ -n "$pw" ]] || pw="$(node -e "process.stdout.write(require('crypto').randomBytes(24).toString('base64url'))")"
body="$(mktemp)"
resp="$(mktemp)"
TMP_PATHS+=("$body" "$resp")
EMAIL="$OWNER_EMAIL" PW="$pw" node -e \
  "process.stdout.write(JSON.stringify({email:process.env.EMAIL,password:process.env.PW,email_confirm:true}))" > "$body"
code="$(auth_headers "$SERVICE_KEY" \
  | curl -sS -o "$resp" -w '%{http_code}' --config - -H 'Content-Type: application/json' \
      --data @"$body" "$API_URL/auth/v1/admin/users")"
err="$(json_get 'd.error_code ?? d.msg ?? ""' < "$resp" 2>/dev/null || true)"
rm -f "$body" "$resp"
unset pw
case "$code" in
  200|201) echo "Created $OWNER_EMAIL." ;;
  422) [[ "$err" == "email_exists" ]] || die "Creating the owner failed: $err"
       echo "$OWNER_EMAIL already exists; left unchanged." ;;
  *) die "Creating the owner failed (HTTP $code${err:+: $err})." ;;
esac

# ── 6. Optional Vercel deploy ─────────────────────────────────────────────────
if [[ "$MODE" == "hosted" ]] && yes_no "Deploy the web app to Vercel now?" n; then
  VERCEL_USED=1
  "${VERCEL[@]}" whoami >/dev/null 2>&1 || "${VERCEL[@]}" login
  echo "When asked for the code directory, answer: apps/web"
  "${VERCEL[@]}" link
  for kv in "VITE_SUPABASE_URL=$API_URL" "VITE_SUPABASE_ANON_KEY=$ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY"; do
    name="${kv%%=*}"
    "${VERCEL[@]}" env rm "$name" production --yes >/dev/null 2>&1 || true
    printf '%s' "${kv#*=}" | "${VERCEL[@]}" env add "$name" production >/dev/null
  done
  url="$("${VERCEL[@]}" deploy --prod | tail -n 1)"
  echo "Deployed: $url"
  # deploy prints the per-deployment URL; the stable one is the project's production domain
  site="$(ask "Production domain for auth redirects (e.g. https://<project>.vercel.app)" "$SITE_URL")"
  if [[ "$site" != "$SITE_URL" ]]; then
    save SITE_URL "$site"
    push_auth
  fi
fi

say "Done"
cat <<EOF
Start the app locally:   npm run dev   (http://localhost:3000)
Sign in as $OWNER_EMAIL; the first sign-in runs onboarding.
Add family members:      docs/self-hosting.md → "Adding family members"
EOF
