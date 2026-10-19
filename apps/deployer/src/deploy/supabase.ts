// Supabase side of the deploy: the hosted-mode steps of scripts/setup.sh and
// the settings `supabase config push` applies from supabase/config.toml,
// as Management API and Auth admin API calls (through api/supabase.ts).
import schemaSql from '../../../../docs/schema.sql?raw'

import { ApiError, requestJson, supabaseApi } from '#/lib/api'

import { ConfirmReuseError, DeployError, withRetry } from './context'
import type { DeployContext } from './context'

const REF_PATTERN = /^[a-z]{20}$/
const HEALTH_POLL_MS = 10_000
const HEALTH_POLLS = 60 // 10 minutes, as in setup.sh

/** Last object docs/schema.sql creates: present only when the whole file ran */
export const SCHEMA_SENTINEL_POLICY = 'avatars_select'

interface Project {
  id: string
  ref?: string
  name: string
  organization_slug?: string
  status: string
  created_at?: string
}

interface ApiKey {
  name: string
  type?: string | null
  api_key?: string | null
}

function token(ctx: DeployContext) {
  return ctx.input.supabaseToken.trim()
}

function ref(ctx: DeployContext): string {
  const value = ctx.state.ref
  if (!value) throw new DeployError('The Supabase project is not known yet.')
  return value
}

/** 24 random bytes, base64url, like setup.sh. Used once for project creation and never kept. */
function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function query<T>(ctx: DeployContext, sql: string): Promise<T> {
  return supabaseApi<T>(
    token(ctx),
    'POST',
    `/v1/projects/${ref(ctx)}/database/query`,
    {
      query: sql,
    },
  )
}

/** Finds the project by name in the chosen organization, or creates it */
export async function findOrCreateProject(ctx: DeployContext): Promise<void> {
  const { input, state } = ctx
  const projects = await supabaseApi<Array<Project>>(
    token(ctx),
    'GET',
    '/v1/projects',
  )
  let project = projects.find(
    (p) =>
      p.name === input.projectName && p.organization_slug === input.orgSlug,
  )
  if (project) {
    // A same-named project may be someone's live instance: never reuse it silently
    if (!state.reuseConfirmed) {
      const created = project.created_at
        ? ` (created ${new Date(project.created_at).toLocaleDateString()})`
        : ''
      throw new ConfirmReuseError(
        `A Supabase project named "${input.projectName}" already exists in this organization${created}. Reuse it? Its data and sign-in settings are kept; only its app address is updated, sign-ups stay off, and the app is deployed to it. To start fresh instead, go back and pick another project name.`,
      )
    }
    state.reused = true
    ctx.note('Reusing the existing project.')
  } else {
    project = await supabaseApi<Project>(token(ctx), 'POST', '/v1/projects', {
      name: input.projectName,
      organization_slug: input.orgSlug,
      region: input.region,
      db_pass: randomPassword(),
    })
  }
  const value = project.ref ?? project.id
  if (!REF_PATTERN.test(value)) {
    throw new DeployError('Supabase returned an unexpected project reference.')
  }
  state.ref = value
}

export async function waitForHealthy(ctx: DeployContext): Promise<void> {
  let status = 'unknown'
  for (let i = 0; i < HEALTH_POLLS; i++) {
    const project = await withRetry(ctx, () =>
      supabaseApi<Project>(token(ctx), 'GET', `/v1/projects/${ref(ctx)}`),
    )
    status = project.status
    if (status === 'ACTIVE_HEALTHY') return
    if (/PAUSE|INACTIVE|REMOVED|FAILED|GOING_DOWN/.test(status)) {
      throw new DeployError(
        `The Supabase project is ${status.toLowerCase().replace(/_/g, ' ')}. Restore it in the Supabase dashboard, then retry.`,
      )
    }
    ctx.note(
      `Project status: ${status.toLowerCase().replace(/_/g, ' ')}. New projects take a few minutes.`,
    )
    await ctx.sleep(HEALTH_POLL_MS)
  }
  throw new DeployError(
    `The Supabase project is still starting (status: ${status}). Wait a few minutes, then retry.`,
  )
}

/**
 * Turns sign-ups off as soon as the project is up. The app goes live before
 * the full auth config (which needs its URL) is pushed, and whoever signs in
 * first on an empty database becomes the owner.
 */
export async function lockSignups(ctx: DeployContext): Promise<void> {
  await withRetry(ctx, () =>
    supabaseApi(token(ctx), 'PATCH', `/v1/projects/${ref(ctx)}/config/auth`, {
      disable_signup: true,
      external_anonymous_users_enabled: false,
    }),
  )
}

interface SchemaState {
  present: boolean
  tables: number
  complete: boolean
}

async function schemaState(ctx: DeployContext): Promise<SchemaState> {
  const result = await query<
    Array<SchemaState> | { rows?: Array<SchemaState> }
  >(
    ctx,
    `select to_regclass('public.families') is not null as present,
       (select count(*)::int from pg_tables where schemaname = 'public') as tables,
       exists (select 1 from pg_policies where schemaname = 'storage'
               and tablename = 'objects' and policyname = '${SCHEMA_SENTINEL_POLICY}') as complete`,
  )
  const row = Array.isArray(result) ? result[0] : result.rows?.[0]
  if (!row) throw new DeployError('Could not read the database state.')
  return row
}

/**
 * Applies docs/schema.sql in one transaction, only to an empty database.
 * The schema drops tables before creating them, so it must never run on data.
 */
export async function applySchema(ctx: DeployContext): Promise<void> {
  const before = await schemaState(ctx)
  if (before.present && before.complete) {
    ctx.note('The Family Space schema is already in place; left untouched.')
    return
  }
  if (before.present) {
    throw new DeployError(
      'This database has a partly applied Family Space schema. Delete the project in Supabase (or pick a new project name), then retry.',
    )
  }
  if (before.tables > 0) {
    throw new DeployError(
      `This database already has ${before.tables} other table(s). Use a new project name so nothing is overwritten.`,
    )
  }
  // One request is one implicit transaction: a failure rolls the whole file
  // back. No explicit BEGIN/COMMIT, which would leave a pooled session in an
  // aborted transaction when a statement fails before the COMMIT.
  await query(ctx, schemaSql)
  const after = await schemaState(ctx)
  if (!after.present || !after.complete) {
    throw new DeployError(
      'The schema did not apply completely. Retry; if it fails again, use a new project.',
    )
  }
}

/**
 * The avatars bucket from supabase/config.toml [storage.buckets.avatars]
 * (what `supabase seed buckets` creates), plus the [api] and [storage]
 * settings `config push` applies.
 */
export async function configureStorageAndApi(
  ctx: DeployContext,
): Promise<void> {
  await query(
    ctx,
    `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
     values ('avatars', 'avatars', true, 204800, array['image/jpeg', 'image/png', 'image/webp'])
     on conflict (id) do update set public = excluded.public,
       file_size_limit = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types`,
  )
  await supabaseApi(token(ctx), 'PATCH', `/v1/projects/${ref(ctx)}/postgrest`, {
    db_schema: 'public,graphql_public',
    db_extra_search_path: 'public,extensions',
    max_rows: 1000,
  })
  await supabaseApi(
    token(ctx),
    'PATCH',
    `/v1/projects/${ref(ctx)}/config/storage`,
    {
      fileSizeLimit: 50 * 1024 * 1024,
      features: { s3Protocol: { enabled: true } },
    },
  )
}

/** Legacy anon/service_role keys when present, else publishable/secret (as setup.sh) */
export async function readApiKeys(ctx: DeployContext): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    const keys = await supabaseApi<Array<ApiKey>>(
      token(ctx),
      'GET',
      `/v1/projects/${ref(ctx)}/api-keys?reveal=true`,
    )
    const anon = (
      keys.find((k) => k.name === 'anon') ??
      keys.find((k) => k.type === 'publishable')
    )?.api_key
    const service = (
      keys.find((k) => k.name === 'service_role') ??
      keys.find((k) => k.type === 'secret')
    )?.api_key
    if (anon && service) {
      ctx.state.anonKey = anon
      ctx.state.serviceKey = service
      return
    }
    if (attempt >= 6)
      throw new DeployError(
        'The project API keys are not available yet. Retry in a minute.',
      )
    await ctx.sleep(5_000)
  }
}

/** The redirect URLs supabase/config.toml lists besides the site URL */
const EXTRA_REDIRECTS = ['http://localhost:3000', 'familyspace://auth']

/**
 * What `supabase config push` sends for supabase/config.toml [auth]. OAuth
 * providers are left out: they are off on a new project, and an existing
 * project keeps any Google sign-in it already has.
 */
export function authConfig(siteUrl: string, redirects: Array<string>) {
  return {
    site_url: siteUrl,
    uri_allow_list: redirects.join(','),
    jwt_exp: 3600,
    refresh_token_rotation_enabled: true,
    security_refresh_token_reuse_interval: 10,
    disable_signup: true,
    external_anonymous_users_enabled: false,
    security_manual_linking_enabled: true,
    password_min_length: 6,
    password_required_characters: '',
    rate_limit_anonymous_users: 30,
    rate_limit_token_refresh: 150,
    rate_limit_otp: 30,
    rate_limit_verify: 30,
    rate_limit_sms_sent: 30,
    rate_limit_web3: 30,
    mfa_max_enrolled_factors: 10,
    mfa_totp_enroll_enabled: true,
    mfa_totp_verify_enabled: true,
    mfa_phone_enroll_enabled: false,
    mfa_phone_verify_enabled: false,
    mfa_phone_otp_length: 6,
    mfa_phone_template: 'Your code is {{ .Code }}',
    mfa_phone_max_frequency: 5,
    mfa_web_authn_enroll_enabled: false,
    mfa_web_authn_verify_enabled: false,
    sessions_timebox: 0,
    sessions_inactivity_timeout: 0,
    external_email_enabled: true,
    mailer_secure_email_change_enabled: true,
    mailer_autoconfirm: false,
    mailer_otp_length: 6,
    mailer_otp_exp: 3600,
    security_update_password_require_reauthentication: false,
    smtp_max_frequency: 60,
    external_phone_enabled: false,
    sms_max_frequency: 5,
    sms_autoconfirm: false,
    sms_template: 'Your code is {{ .Code }}',
    external_web3_solana_enabled: false,
    external_web3_ethereum_enabled: false,
  }
}

const isLocal = (url: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)

/**
 * Pushes the auth config with the app's production URL. A project whose site
 * URL is still the localhost default has never been configured and gets the
 * full config.toml settings. One already serving a real address keeps its own
 * settings (password rules, rate limits, MFA, Google): only its redirect list
 * gains the new URL and sign-ups stay off.
 */
export async function pushAuthConfig(ctx: DeployContext): Promise<void> {
  const appUrl = ctx.state.appUrl
  if (!appUrl) throw new DeployError('The app URL is not known yet.')
  const path = `/v1/projects/${ref(ctx)}/config/auth`
  const current = await withRetry(ctx, () =>
    supabaseApi<{ site_url?: string | null; uri_allow_list?: string | null }>(
      token(ctx),
      'GET',
      path,
    ),
  )
  const configured = Boolean(current.site_url && !isLocal(current.site_url))
  const siteUrl = configured ? current.site_url! : appUrl
  const existing = (current.uri_allow_list ?? '').split(',').filter(Boolean)
  const redirects = [
    ...new Set([siteUrl, appUrl, ...EXTRA_REDIRECTS, ...existing]),
  ]
  const body = configured
    ? {
        site_url: siteUrl,
        uri_allow_list: redirects.join(','),
        disable_signup: true,
        external_anonymous_users_enabled: false,
      }
    : authConfig(siteUrl, redirects)
  await withRetry(ctx, () => supabaseApi(token(ctx), 'PATCH', path, body))
}

/** The owner account, auto-confirmed. An existing account is left unchanged. */
export async function createOwner(ctx: DeployContext): Promise<void> {
  const key = ctx.state.serviceKey
  if (!key) throw new DeployError('The service key is not known yet.')
  const headers: Record<string, string> = {
    apikey: key,
    'content-type': 'application/json',
  }
  // sb_secret_ keys are not JWTs: apikey header only
  if (!key.startsWith('sb_')) headers.authorization = `Bearer ${key}`
  try {
    await withRetry(ctx, () =>
      requestJson(
        'Supabase Auth',
        `/api/supabase?ref=${ref(ctx)}&path=${encodeURIComponent('/auth/v1/admin/users')}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: ctx.input.ownerEmail,
            password: ctx.input.ownerPassword,
            email_confirm: true,
          }),
        },
      ),
    )
  } catch (error) {
    const code =
      error instanceof ApiError &&
      (error.data as { error_code?: string } | null)?.error_code
    if (code !== 'email_exists') throw error
    ctx.state.ownerExisted = true
    ctx.note(`${ctx.input.ownerEmail} already exists; left unchanged.`)
  }
}
