import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { newState } from '../src/deploy/context'
import type { DeployContext } from '../src/deploy/context'
import { runDeploy, STEPS } from '../src/deploy/run'
import { SCHEMA_SENTINEL_POLICY } from '../src/deploy/supabase'
import { EMPTY_INPUT } from '../src/lib/form'

const REF = 'abcdefghijklmnopqrst'
const SCHEMA = readFileSync(
  new URL('../../../docs/schema.sql', import.meta.url),
  'utf8',
)
const DOMAIN = 'family-space-xyz.vercel.app'
const FILE = '{"name":"x"}'
const gitSha = (content: string) =>
  createHash('sha1')
    .update(`blob ${Buffer.byteLength(content)}\0${content}`)
    .digest('hex')

interface Call {
  method: string
  url: string
  body?: string
  headers: Record<string, string>
}

/** A fake Supabase + Vercel + GitHub, with knobs for failure cases */
function world() {
  const w = {
    calls: [] as Array<Call>,
    projects: [] as Array<Record<string, string>>,
    schema: { present: false, tables: 0, complete: false, hosted: false } as Record<string, unknown>,
    vercelProject: null as null | { id: string; rootDirectory: string },
    buildStates: [] as Array<string>,
    deployments: 0,
    ownerExists: false,
    authFailuresLeft: 0,
    auth: { site_url: 'http://localhost:3000', uri_allow_list: '' },
    vercelEnv: [] as Array<Record<string, unknown>>,
    rawContent: FILE,
  }
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  const handler = async (
    input: string | URL | Request,
    init: RequestInit = {},
  ) => {
    const url = String(input)
    const method = init.method ?? 'GET'
    const body = typeof init.body === 'string' ? init.body : undefined
    w.calls.push({
      method,
      url,
      body,
      headers: (init.headers ?? {}) as Record<string, string>,
    })
    const u = new URL(url, 'http://deployer.local')

    if (u.pathname === '/api/supabase') {
      const path = u.searchParams.get('path')!
      if (u.searchParams.get('ref')) {
        if (w.ownerExists)
          return json({ error_code: 'email_exists', msg: 'exists' }, 422)
        return json({ id: 'user-1' }, 200)
      }
      if (path === '/v1/projects' && method === 'GET') return json(w.projects)
      if (path === '/v1/projects' && method === 'POST') {
        const p = {
          id: REF,
          ref: REF,
          name: JSON.parse(body!).name,
          organization_slug: 'org',
          status: 'COMING_UP',
        }
        w.projects.push(p)
        return json(p, 201)
      }
      if (path === `/v1/projects/${REF}`)
        return json({ ...w.projects[0], status: 'ACTIVE_HEALTHY' })
      if (path.endsWith('/database/query')) {
        const q: string = JSON.parse(body!).query
        if (q.includes('to_regclass')) return json([w.schema])
        if (q.includes('create table'))
          w.schema = { present: true, tables: 19, complete: true }
        return json([], 201)
      }
      if (path.endsWith('/api-keys?reveal=true')) {
        return json([
          { name: 'anon', type: 'legacy', api_key: 'anon-jwt' },
          { name: 'service_role', type: 'legacy', api_key: 'service-jwt' },
        ])
      }
      if (path.endsWith('/config/auth')) {
        if (w.authFailuresLeft-- > 0) return json({ message: 'starting' }, 503)
        if (method === 'GET') return json(w.auth)
        const patch = JSON.parse(body!)
        if (patch.site_url) w.auth = { ...w.auth, site_url: patch.site_url }
        return json({})
      }
      return json({})
    }

    if (u.host === 'api.github.com') {
      return json({
        truncated: false,
        tree: [
          {
            path: 'package.json',
            type: 'blob',
            mode: '100644',
            sha: gitSha(FILE),
          },
          { path: 'apps', type: 'tree', mode: '040000', sha: 'x' },
          {
            path: 'apps/web/package.json',
            type: 'blob',
            mode: '100644',
            sha: gitSha(FILE),
          },
          { path: 'link', type: 'blob', mode: '120000', sha: 'x' },
        ],
      })
    }
    if (u.host === 'raw.githubusercontent.com')
      return new Response(w.rawContent)

    if (u.host === 'api.vercel.com') {
      if (
        u.pathname.startsWith('/v9/projects/') &&
        u.pathname.endsWith('/domains')
      ) {
        return json({
          domains: [{ name: 'custom.example.com' }, { name: DOMAIN }],
        })
      }
      if (u.pathname.endsWith('/env') && method === 'GET') {
        return json({ envs: w.vercelEnv })
      }
      if (u.pathname.startsWith('/v9/projects/')) {
        return w.vercelProject
          ? json(w.vercelProject)
          : json({ error: { message: 'not found' } }, 404)
      }
      if (u.pathname === '/v11/projects') {
        w.vercelProject = { id: 'prj_1', rootDirectory: 'apps/web' }
        return json(w.vercelProject)
      }
      if (u.pathname === '/v13/deployments') {
        w.deployments++
        return json({ id: `dpl_${w.deployments}` })
      }
      if (u.pathname.startsWith('/v13/deployments/')) {
        return json({
          readyState: w.buildStates.shift() ?? 'READY',
          errorMessage: 'npm install failed',
        })
      }
      return json({})
    }
    throw new Error(`unexpected ${method} ${url}`)
  }
  vi.stubGlobal('fetch', vi.fn(handler))
  return w
}

function context(teamId = ''): DeployContext {
  return {
    input: {
      ...EMPTY_INPUT,
      supabaseToken: 'sbp_token',
      orgSlug: 'org',
      vercelToken: 'vercel_token',
      vercelTeamId: teamId,
      ownerEmail: 'me@example.com',
      ownerPassword: 'secret1',
    },
    state: newState(),
    note: () => {},
    sleep: () => Promise.resolve(),
  }
}

async function run(ctx: DeployContext, done = new Set<string>()) {
  const order: Array<string> = []
  let error = ''
  let confirm = false
  const ok = await runDeploy(ctx, done, (id, status, message, needsConfirm) => {
    if (status === 'running') order.push(id)
    if (message) error = message
    if (needsConfirm) confirm = true
  })
  return { ok, order, error, done, confirm }
}

const count = (w: ReturnType<typeof world>, match: (c: Call) => boolean) =>
  w.calls.filter(match).length

beforeEach(() => vi.unstubAllGlobals())
afterEach(() => vi.unstubAllGlobals())

describe('deploy pipeline', () => {
  it('runs every step in order on a fresh account', async () => {
    const w = world()
    const ctx = context('team_abc')
    const { ok, order } = await run(ctx)
    expect(ok).toBe(true)
    expect(order).toEqual(STEPS.map((s) => s.id))
    // Supabase and schema first, then Vercel, auth once with the real domain, owner last
    expect(order.indexOf('schema')).toBeLessThan(
      order.indexOf('vercel-project'),
    )
    expect(order.indexOf('domain')).toBeLessThan(order.indexOf('auth'))

    const create = w.calls.find(
      (c) =>
        c.url.includes(encodeURIComponent('/v1/projects')) &&
        c.method === 'POST' &&
        !c.url.includes('query'),
    )!
    const createBody = JSON.parse(create.body!)
    expect(createBody).toMatchObject({
      name: 'family-space',
      organization_slug: 'org',
      region: 'us-east-1',
    })
    expect(createBody.db_pass).toMatch(/^[\w-]{32}$/)
    expect(JSON.stringify(ctx.state)).not.toContain(createBody.db_pass)

    const apply = w.calls.find((c) => c.body?.includes('create table'))!
    expect(JSON.parse(apply.body!).query).toBe(SCHEMA)
    expect(
      w.calls.some(
        (c) => c.body?.includes('storage.buckets') && c.body.includes('204800'),
      ),
    ).toBe(true)

    // Sign-ups go off before anything is deployed; the full config is pushed once
    const authPatches = w.calls.filter(
      (c) =>
        c.method === 'PATCH' &&
        c.url.includes(encodeURIComponent('/config/auth')),
    )
    expect(authPatches).toHaveLength(2)
    const lockIndex = w.calls.indexOf(authPatches[0])
    const firstDeploy = w.calls.findIndex((c) =>
      c.url.includes('/v13/deployments'),
    )
    expect(JSON.parse(authPatches[0].body!).disable_signup).toBe(true)
    expect(lockIndex).toBeLessThan(firstDeploy)
    const authBody = JSON.parse(authPatches[1].body!)
    expect(authBody.site_url).toBe(`https://${DOMAIN}`)
    expect(authBody.uri_allow_list.split(',')).toEqual([
      `https://${DOMAIN}`,
      'http://localhost:3000',
      'familyspace://auth',
    ])
    expect(authBody.disable_signup).toBe(true)
    expect(authBody).not.toHaveProperty('external_google_enabled')

    const env = JSON.parse(
      w.calls.find((c) => c.method === 'POST' && c.url.includes('/env?'))!
        .body!,
    )
    expect(
      env.map((e: { key: string; type: string }) => [e.key, e.type]),
    ).toEqual([
      ['VITE_SUPABASE_URL', 'encrypted'],
      ['VITE_SUPABASE_ANON_KEY', 'encrypted'],
      ['SUPABASE_SERVICE_ROLE_KEY', 'sensitive'],
    ])

    const vercelCalls = w.calls.filter((c) =>
      c.url.startsWith('https://api.vercel.com'),
    )
    expect(vercelCalls.length).toBeGreaterThan(0)
    expect(
      vercelCalls.every(
        (c) => new URL(c.url).searchParams.get('teamId') === 'team_abc',
      ),
    ).toBe(true)

    // Regular files only, uploaded once each, then referenced by the deployment
    expect(count(w, (c) => c.url.endsWith('/v2/files?teamId=team_abc'))).toBe(2)
    const deployment = JSON.parse(
      w.calls.find((c) => c.url.includes('/v13/deployments?'))!.body!,
    )
    expect(
      deployment.files.map((f: { file: string }) => f.file).sort(),
    ).toEqual(['apps/web/package.json', 'package.json'])
    expect(deployment.files[0].sha).toMatch(/^[0-9a-f]{40}$/)
    expect(deployment.projectSettings.rootDirectory).toBe('apps/web')

    const owner = w.calls.find((c) => c.url.includes(`ref=${REF}`))!
    expect(owner.headers).toMatchObject({
      apikey: 'service-jwt',
      authorization: 'Bearer service-jwt',
    })
    expect(ctx.state.appUrl).toBe(`https://${DOMAIN}`)
  })

  it('resumes from the failed step on retry without redoing finished ones', async () => {
    const w = world()
    w.buildStates = ['BUILDING', 'ERROR']
    const ctx = context()
    const first = await run(ctx)
    expect(first.ok).toBe(false)
    expect(first.error).toContain('npm install failed')
    expect(first.done.has('upload')).toBe(true)
    expect(first.done.has('deploy')).toBe(false)

    const callsBefore = w.calls.length
    const second = await run(ctx, first.done)
    expect(second.ok).toBe(true)
    expect(second.order).toEqual(['deploy', 'domain', 'auth', 'owner'])
    const retried = w.calls.slice(callsBefore)
    expect(retried.some((c) => c.url.includes('/v2/files'))).toBe(false)
    expect(w.deployments).toBe(2)
  })

  it('reuses existing resources when re-run after a reload', async () => {
    const w = world()
    await run(context())
    const calls = w.calls.length
    w.ownerExists = true

    const ctx = context() // fresh memory, as after a reload
    const asked = await run(ctx)
    expect(asked.ok).toBe(false)
    expect(asked.confirm).toBe(true)
    expect(asked.error).toMatch(/already exists/)
    ctx.state.reuseConfirmed = true
    const { ok } = await run(ctx, asked.done)
    expect(ok).toBe(true)
    const rerun = w.calls.slice(calls)
    expect(
      rerun.some(
        (c) =>
          c.method === 'POST' &&
          c.url.endsWith(encodeURIComponent('/v1/projects')),
      ),
    ).toBe(false)
    expect(rerun.some((c) => c.body?.includes('create table'))).toBe(false)
    expect(rerun.some((c) => c.url.includes('/v11/projects'))).toBe(false)
    expect(w.projects).toHaveLength(1)
    expect(ctx.state.ownerExisted).toBe(true)
    // A reused project keeps its auth settings: only address fields and the lock
    const reusedPatch = rerun
      .filter(
        (c) =>
          c.method === 'PATCH' &&
          c.url.includes(encodeURIComponent('/config/auth')),
      )
      .at(-1)!
    expect(Object.keys(JSON.parse(reusedPatch.body!)).sort()).toEqual([
      'disable_signup',
      'external_anonymous_users_enabled',
      'site_url',
      'uri_allow_list',
    ])
  })

  it('retries auth calls briefly while Auth starts up', async () => {
    const w = world()
    w.authFailuresLeft = 2
    expect((await run(context())).ok).toBe(true)
    // The sign-up lock is the first auth call: two 503s, then success
    expect(
      count(
        w,
        (c) =>
          c.method === 'PATCH' &&
          c.url.includes(encodeURIComponent('/config/auth')),
      ),
    ).toBe(4)
  })

  it('keeps a real site URL and existing redirects on a reused project', async () => {
    const w = world()
    w.auth = {
      site_url: 'https://family.example.com',
      uri_allow_list: 'https://family.example.com,https://old.example.com',
    }
    expect((await run(context())).ok).toBe(true)
    const patch = w.calls.filter(
      (c) =>
        c.method === 'PATCH' &&
        c.url.includes(encodeURIComponent('/config/auth')),
    )[1]
    const body = JSON.parse(patch.body!)
    expect(body.site_url).toBe('https://family.example.com')
    expect(body.uri_allow_list.split(',')).toEqual(
      expect.arrayContaining([`https://${DOMAIN}`, 'https://old.example.com']),
    )
  })

  it('refuses a Vercel project wired to another Supabase project', async () => {
    const w = world()
    w.vercelEnv = [
      {
        key: 'VITE_SUPABASE_URL',
        value: 'https://otherprojectrefxxxx.supabase.co',
        type: 'encrypted',
        decrypted: true,
        target: ['production'],
      },
    ]
    const { ok, error, order } = await run(context())
    expect(ok).toBe(false)
    expect(order.at(-1)).toBe('env')
    expect(error).toMatch(/different Supabase project/)
    expect(
      w.calls.some((c) => c.method === 'POST' && c.url.includes('/env?')),
    ).toBe(false)
  })

  it('continues when the existing VITE_SUPABASE_URL cannot be read', async () => {
    const w = world()
    w.vercelEnv = [
      {
        key: 'VITE_SUPABASE_URL',
        value: '',
        type: 'sensitive',
        target: ['production'],
      },
      {
        key: 'VITE_SUPABASE_URL',
        value: 'https://x.supabase.co',
        type: 'plain',
        target: ['preview'],
      },
    ]
    expect((await run(context())).ok).toBe(true)
  })

  it('sends the full auth config to a project created before a reload', async () => {
    const w = world()
    w.buildStates = ['ERROR']
    expect((await run(context())).ok).toBe(false)
    const calls = w.calls.length
    const ctx = context() // reload: memory gone, project exists, auth never configured
    ctx.state.reuseConfirmed = true
    expect((await run(ctx)).ok).toBe(true)
    const patch = w.calls
      .slice(calls)
      .filter(
        (c) =>
          c.method === 'PATCH' &&
          c.url.includes(encodeURIComponent('/config/auth')),
      )
      .at(-1)!
    expect(JSON.parse(patch.body!)).toMatchObject({
      site_url: `https://${DOMAIN}`,
      security_manual_linking_enabled: true,
    })
  })

  it('refuses source files that do not match the pinned commit', async () => {
    const w = world()
    w.rawContent = '{"name":"tampered"}'
    const { ok, error, order } = await run(context())
    expect(ok).toBe(false)
    expect(order.at(-1)).toBe('upload')
    expect(error).toMatch(/does not match the pinned commit/)
    expect(w.calls.some((c) => c.url.includes('/v2/files'))).toBe(false)
  })

  it('refuses a half-applied schema', async () => {
    const w = world()
    w.schema = { present: true, tables: 7, complete: false }
    const { ok, error, order } = await run(context())
    expect(ok).toBe(false)
    expect(order.at(-1)).toBe('schema')
    expect(error).toMatch(/partly applied/)
  })

  it('refuses a multi-family edition database before changing anything', async () => {
    const w = world()
    w.schema = { present: true, tables: 23, complete: true, hosted: true }
    const { ok, error, order } = await run(context())
    expect(ok).toBe(false)
    expect(order.at(-1)).toBe('lock')
    expect(error).toMatch(/multi-family/)
    expect(w.calls.some((c) => c.url.includes('config%2Fauth') || c.url.includes('config/auth'))).toBe(false)
  })

  it('refuses a database with other tables', async () => {
    const w = world()
    w.schema = { present: false, tables: 3, complete: false }
    const { ok, error } = await run(context())
    expect(ok).toBe(false)
    expect(error).toMatch(/3 other table/)
  })

  it('does not take over an unrelated Vercel project with the same name', async () => {
    const w = world()
    w.vercelProject = { id: 'prj_other', rootDirectory: '' }
    const { ok, error, order } = await run(context())
    expect(ok).toBe(false)
    // Caught before any Supabase project is created
    expect(order).toEqual(['names'])
    expect(error).toMatch(/not a Family Space project/)
    expect(w.projects).toHaveLength(0)
  })

  it('sends only apikey for sb_secret_ keys', async () => {
    const w = world()
    const ctx = context()
    const done = new Set(STEPS.map((s) => s.id).filter((id) => id !== 'owner'))
    ctx.state.ref = REF
    ctx.state.serviceKey = 'sb_secret_abc'
    expect((await run(ctx, done)).ok).toBe(true)
    const owner = w.calls.find((c) => c.url.includes(`ref=${REF}`))!
    expect(owner.headers.authorization).toBeUndefined()
    expect(owner.headers.apikey).toBe('sb_secret_abc')
  })
})

describe('schema guard', () => {
  it('uses the last object docs/schema.sql creates as its completeness check', () => {
    const sql = readFileSync(
      new URL('../../../docs/schema.sql', import.meta.url),
      'utf8',
    )
    const creates = [
      ...sql.matchAll(/^create\s+(?:or\s+replace\s+)?(\w+)\s+"?([\w.]+)"?/gim),
    ]
    expect(creates.at(-1)?.slice(1)).toEqual(['policy', SCHEMA_SENTINEL_POLICY])
  })
})
