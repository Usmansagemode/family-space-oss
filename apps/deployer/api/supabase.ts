// Forwards the deployer's Supabase calls. The Management API only allows
// Supabase's own origins through CORS, and the Auth admin API refuses
// sb_secret_ keys from browser user agents, so these calls cannot go direct.
// Stateless: nothing is stored or logged. Upstream hosts are fixed here and
// never taken from the request.

const MANAGEMENT_API = 'https://api.supabase.com'
const REF = '[a-z]{20}'
const REF_PATTERN = new RegExp(`^${REF}$`)
const MAX_BODY_BYTES = 256 * 1024
// Below the function's maxDuration (vercel.json) so the client gets a clean error
const UPSTREAM_TIMEOUT_MS = 50_000
const FORWARDED_HEADERS = ['authorization', 'content-type', 'apikey']

// Every Management API call the deploy makes, and nothing else
const MANAGEMENT_ROUTES: Array<[string, RegExp]> = [
  ['GET', /^\/v1\/organizations$/],
  ['GET', /^\/v1\/projects$/],
  ['POST', /^\/v1\/projects$/],
  ['GET', new RegExp(`^/v1/projects/${REF}$`)],
  ['GET', new RegExp(`^/v1/projects/${REF}/api-keys\\?reveal=true$`)],
  ['POST', new RegExp(`^/v1/projects/${REF}/database/query$`)],
  ['PATCH', new RegExp(`^/v1/projects/${REF}/config/auth$`)],
  ['PATCH', new RegExp(`^/v1/projects/${REF}/postgrest$`)],
  ['PATCH', new RegExp(`^/v1/projects/${REF}/config/storage$`)],
]
const AUTH_ADMIN_PATH = '/auth/v1/admin/users'

function reply(status: number, message: string): Response {
  return Response.json(
    { message },
    { status, headers: { 'cache-control': 'no-store' } },
  )
}

/**
 * `/api/supabase?path=<path and query>` → api.supabase.com<path>
 * `/api/supabase?ref=<ref>&path=/auth/v1/admin/users` (POST) → <ref>.supabase.co
 */
function upstreamUrl(method: string, params: URLSearchParams): string | null {
  const path = params.get('path') ?? ''
  const ref = params.get('ref')
  if (ref !== null) {
    return method === 'POST' &&
      path === AUTH_ADMIN_PATH &&
      REF_PATTERN.test(ref)
      ? `https://${ref}.supabase.co${AUTH_ADMIN_PATH}`
      : null
  }
  return MANAGEMENT_ROUTES.some(([m, p]) => m === method && p.test(path))
    ? MANAGEMENT_API + path
    : null
}

async function handle(request: Request): Promise<Response> {
  const method = request.method.toUpperCase()
  const target = upstreamUrl(method, new URL(request.url).searchParams)
  if (!target) return reply(403, 'This request is not allowed.')
  // Only this site's own pages call the function (curl can skip this; it is not a control)
  const site = request.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin')
    return reply(403, 'This request is not allowed.')

  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return reply(413, 'Request body too large.')
  const body = method === 'GET' ? undefined : await request.arrayBuffer()
  if (body && body.byteLength > MAX_BODY_BYTES) {
    return reply(413, 'Request body too large.')
  }

  const headers = new Headers()
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name)
    if (value !== null) headers.set(name, value)
  }

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    const noBody = [204, 205, 304].includes(upstream.status)
    // Read inside the try so a timeout mid-body still gets the generic reply
    const data = noBody ? null : await upstream.arrayBuffer()
    return new Response(data, {
      status: upstream.status,
      // Supabase answers JSON; never reflect another type on this origin
      headers: {
        'cache-control': 'no-store',
        'content-type': 'application/json',
      },
    })
  } catch (error) {
    return error instanceof DOMException && error.name === 'TimeoutError'
      ? reply(504, 'Supabase did not respond in time.')
      : reply(502, 'Could not reach Supabase.')
  }
}

export default { fetch: handle }
