// Vercel side of the deploy, called straight from the browser (the Vercel
// API allows any origin). The source is this repo at the commit the deployer
// was built from, so the app matches the bundled schema.
import { ApiError, requestJson } from '#/lib/api'

import { DeployError } from './context'
import type { DeployContext, UploadedFile } from './context'

const API = 'https://api.vercel.com'
const ROOT_DIRECTORY = 'apps/web'
const FRAMEWORK = 'tanstack-start'
const UPLOAD_CONCURRENCY = 8
const READY_POLL_MS = 5_000
const READY_POLLS = 240 // 20 minutes

export const SOURCE_REPO = __SOURCE_REPO__
export const SOURCE_REF = __SOURCE_REF__

interface VercelProject {
  id: string
  rootDirectory?: string | null
}

function vercel<T>(
  ctx: DeployContext,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const url = new URL(API + path)
  if (ctx.input.vercelTeamId)
    url.searchParams.set('teamId', ctx.input.vercelTeamId)
  const json = body !== undefined && !(body instanceof ArrayBuffer)
  return requestJson<T>('Vercel', url.toString(), {
    method,
    headers: {
      authorization: `Bearer ${ctx.input.vercelToken.trim()}`,
      ...(json && { 'content-type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : json ? JSON.stringify(body) : body,
  })
}

function projectId(ctx: DeployContext): string {
  const id = ctx.state.vercelProjectId
  if (!id) throw new DeployError('The Vercel project is not known yet.')
  return id
}

function notOurs(name: string) {
  return new DeployError(
    `A Vercel project named "${name}" already exists and is not a Family Space project. Go back and choose another project name.`,
  )
}

/**
 * Read-only check before anything is created: a name taken by an unrelated
 * Vercel project would otherwise surface only after the Supabase project exists.
 */
export async function checkName(ctx: DeployContext): Promise<void> {
  const name = ctx.input.projectName
  try {
    const project = await vercel<VercelProject>(
      ctx,
      'GET',
      `/v9/projects/${name}`,
    )
    if (project.rootDirectory !== ROOT_DIRECTORY) throw notOurs(name)
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
  }
}

/** Finds the project by name or creates it with apps/web as the root directory */
export async function ensureProject(ctx: DeployContext): Promise<void> {
  const name = ctx.input.projectName
  let project: VercelProject
  try {
    project = await vercel<VercelProject>(ctx, 'GET', `/v9/projects/${name}`)
    if (project.rootDirectory !== ROOT_DIRECTORY) throw notOurs(name)
    ctx.note('Found an existing project with this name; reusing it.')
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
    project = await vercel<VercelProject>(ctx, 'POST', '/v11/projects', {
      name,
      framework: FRAMEWORK,
      rootDirectory: ROOT_DIRECTORY,
    })
  }
  ctx.state.vercelProjectId = project.id
}

/** The three variables setup.sh sets, production only; the service key is sensitive */
export async function setEnvironment(ctx: DeployContext): Promise<void> {
  const { ref, anonKey, serviceKey } = ctx.state
  if (!ref || !anonKey || !serviceKey)
    throw new DeployError('The Supabase keys are not known yet.')
  // A same-named project already wired to another Supabase project is someone else's app
  const supabaseUrl = `https://${ref}.supabase.co`
  const listed = await vercel<{
    envs?: Array<{
      key: string
      value?: string
      type?: string
      decrypted?: boolean
      target?: Array<string>
    }>
  }>(ctx, 'GET', `/v10/projects/${projectId(ctx)}/env?decrypt=true`)
  const current = (listed.envs ?? []).filter(
    (e) => e.key === 'VITE_SUPABASE_URL' && e.target?.includes('production'),
  )
  // Sensitive values never come back, and encrypted ones only when decrypted
  const readable = current.filter(
    (e) => e.type === 'plain' || e.decrypted === true,
  )
  if (readable.length < current.length) {
    ctx.note(
      'Could not read the existing VITE_SUPABASE_URL to verify it; continuing.',
    )
  }
  if (readable.some((e) => e.value !== supabaseUrl)) {
    throw new DeployError(
      `The Vercel project "${ctx.input.projectName}" belongs to a different Supabase project. Go back and choose another project name.`,
    )
  }
  const target = ['production']
  await vercel(ctx, 'POST', `/v10/projects/${projectId(ctx)}/env?upsert=true`, [
    {
      key: 'VITE_SUPABASE_URL',
      value: supabaseUrl,
      type: 'encrypted',
      target,
    },
    {
      key: 'VITE_SUPABASE_ANON_KEY',
      value: anonKey,
      type: 'encrypted',
      target,
    },
    {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      value: serviceKey,
      type: 'sensitive',
      target,
    },
  ])
}

async function sha1(data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function rawUrl(path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_REF}/${encoded}`
}

/**
 * Lists the repo at SOURCE_REF (one GitHub API call), then fetches each file
 * from raw.githubusercontent.com and uploads it to Vercel. Files already
 * uploaded in this session are skipped on retry.
 */
export async function uploadSource(ctx: DeployContext): Promise<void> {
  const tree = await requestJson<{
    tree: Array<{ path: string; type: string; mode: string; sha: string }>
    truncated: boolean
  }>(
    'GitHub',
    `https://api.github.com/repos/${SOURCE_REPO}/git/trees/${SOURCE_REF}?recursive=1`,
    {
      headers: { accept: 'application/vnd.github+json' },
    },
  ).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      throw new DeployError(
        `Commit ${SOURCE_REF} is not on GitHub in ${SOURCE_REPO}. Push it, or build the deployer with SOURCE_REPO/SOURCE_REF set.`,
      )
    }
    throw error
  })
  if (tree.truncated)
    throw new DeployError('The repository listing from GitHub was incomplete.')
  // Regular files only: no directories, submodules or symlinks
  const blobs = new Map(
    tree.tree
      .filter((e) => e.type === 'blob' && e.mode !== '120000')
      .map((e) => [e.path, e.sha]),
  )
  const paths = [...blobs.keys()]
  if (paths.some((p) => p.startsWith('/') || p.split('/').includes('..'))) {
    throw new DeployError(
      'The repository listing from GitHub had an invalid path.',
    )
  }
  const { files } = ctx.state
  const todo = paths.filter((p) => !files.has(p))
  let done = paths.length - todo.length

  const upload = async (path: string) => {
    let res: Response
    try {
      res = await fetch(rawUrl(path))
    } catch {
      throw new DeployError(
        'Could not reach GitHub to download the app source. Check your connection, then retry.',
      )
    }
    if (!res.ok)
      throw new DeployError(
        `Could not download ${path} from GitHub (HTTP ${res.status}).`,
      )
    const data = await res.arrayBuffer()
    // The file must be the blob the pinned commit lists (git hashes "blob <size>\0<content>")
    const header = new TextEncoder().encode(`blob ${data.byteLength}\0`)
    const blob = new Uint8Array(header.length + data.byteLength)
    blob.set(header)
    blob.set(new Uint8Array(data), header.length)
    if ((await sha1(blob)) !== blobs.get(path)) {
      throw new DeployError(
        `${path} from GitHub does not match the pinned commit. Retry in a minute.`,
      )
    }
    const entry: UploadedFile = {
      file: path,
      sha: await sha1(data),
      size: data.byteLength,
    }
    await vercel(ctx, 'POST', '/v2/files', data, {
      'content-type': 'application/octet-stream',
      'x-vercel-digest': entry.sha,
    })
    files.set(path, entry)
    // Every 10th file, so screen readers are not flooded with updates
    if (++done % 10 === 0 || done === paths.length) {
      ctx.note(`Uploaded ${done} of ${paths.length} files`)
    }
  }
  const worker = async () => {
    for (let path = todo.shift(); path !== undefined; path = todo.shift()) {
      try {
        await upload(path)
      } catch (error) {
        todo.length = 0 // stop the other workers
        throw error
      }
    }
  }
  await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker))
}

interface Deployment {
  id: string
  readyState?: string
  errorMessage?: string | null
  inspectorUrl?: string | null
}

/** Creates the production deployment (once) and waits until it is READY */
export async function deploy(ctx: DeployContext): Promise<void> {
  const { state } = ctx
  if (!state.deploymentId) {
    const created = await vercel<Deployment>(
      ctx,
      'POST',
      '/v13/deployments?skipAutoDetectionConfirmation=1',
      {
        name: ctx.input.projectName,
        project: projectId(ctx),
        target: 'production',
        files: [...state.files.values()],
        projectSettings: {
          framework: FRAMEWORK,
          rootDirectory: ROOT_DIRECTORY,
          sourceFilesOutsideRootDirectory: true,
        },
      },
    )
    state.deploymentId = created.id
  }
  for (let i = 0; i < READY_POLLS; i++) {
    const d = await vercel<Deployment>(
      ctx,
      'GET',
      `/v13/deployments/${state.deploymentId}`,
    )
    if (d.readyState === 'READY') return
    if (d.readyState === 'ERROR' || d.readyState === 'CANCELED') {
      // A retry starts a fresh deployment
      state.deploymentId = undefined
      throw new DeployError(
        `The Vercel build failed${d.errorMessage ? `: ${d.errorMessage}` : '.'}${d.inspectorUrl ? ` Build log: ${d.inspectorUrl}` : ''}`,
      )
    }
    ctx.note(
      `Build ${(d.readyState ?? 'queued').toLowerCase()}… this usually takes a few minutes.`,
    )
    await ctx.sleep(READY_POLL_MS)
  }
  throw new DeployError(
    'The Vercel build is taking longer than expected. Retry to keep waiting.',
  )
}

/** The project's production domain (e.g. https://family-space-abc.vercel.app) */
export async function readProductionDomain(ctx: DeployContext): Promise<void> {
  const { domains } = await vercel<{ domains: Array<{ name: string }> }>(
    ctx,
    'GET',
    `/v9/projects/${projectId(ctx)}/domains?production=true&redirects=false`,
  )
  const name = (
    domains.find((d) => d.name.endsWith('.vercel.app')) ?? domains.at(0)
  )?.name
  if (!name)
    throw new DeployError(
      'Vercel has not assigned a domain to the project yet. Retry in a minute.',
    )
  ctx.state.appUrl = `https://${name}`
}
