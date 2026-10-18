import { afterEach, describe, expect, it, vi } from 'vitest'

import proxy from '../api/supabase'

const REF = 'abcdefghijklmnopqrst'

function call(query: string, init: RequestInit = {}) {
  return proxy.fetch(
    new Request(`https://deploy.example/api/supabase?${query}`, init),
  )
}

function mockUpstream(status = 200, body = '{"ok":true}') {
  const spy = vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(body, {
        status,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'a=b',
          'access-control-allow-origin': '*',
        },
      }),
  )
  vi.stubGlobal('fetch', spy)
  return spy
}

afterEach(() => vi.unstubAllGlobals())

describe('api/supabase', () => {
  it('forwards an allowed Management API call with only the allowed headers', async () => {
    const spy = mockUpstream()
    const res = await call(
      `path=${encodeURIComponent(`/v1/projects/${REF}/database/query`)}`,
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer sbp_x',
          'content-type': 'application/json',
          cookie: 'c=d',
          'x-forwarded-host': 'evil',
        },
        body: '{"query":"select 1"}',
      },
    )
    expect(res.status).toBe(200)
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe(
      `https://api.supabase.com/v1/projects/${REF}/database/query`,
    )
    const sent = init!.headers as Headers
    expect([...sent.keys()].sort()).toEqual(['authorization', 'content-type'])
    expect(init!.redirect).toBe('manual')
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('passes the api-keys reveal query through', async () => {
    const spy = mockUpstream()
    await call(
      `path=${encodeURIComponent(`/v1/projects/${REF}/api-keys?reveal=true`)}`,
    )
    expect(spy.mock.calls[0][0]).toBe(
      `https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`,
    )
  })

  it.each([
    ['DELETE', `/v1/projects/${REF}`],
    ['GET', `/v1/projects/${REF}/database/query`],
    ['POST', '/v1/projects/ABC/database/query'],
    ['GET', '/v1/projects/../organizations'],
    ['GET', '//evil.example/v1/projects'],
    ['GET', `/v1/projects/${REF}/api-keys?reveal=true&x=1`],
    ['POST', '/v1/oauth/token'],
  ])('rejects %s %s', async (method, path) => {
    const spy = mockUpstream()
    const res = await call(`path=${encodeURIComponent(path)}`, {
      method,
      body: method === 'GET' ? undefined : '{}',
    })
    expect(res.status).toBe(403)
    expect(spy).not.toHaveBeenCalled()
  })

  it('sends the owner-user call to the project host built from a validated ref', async () => {
    const spy = mockUpstream(201)
    const res = await call(`ref=${REF}&path=/auth/v1/admin/users`, {
      method: 'POST',
      headers: { apikey: 'sb_secret_x', 'content-type': 'application/json' },
      body: '{}',
    })
    expect(res.status).toBe(201)
    expect(spy.mock.calls[0][0]).toBe(
      `https://${REF}.supabase.co/auth/v1/admin/users`,
    )
  })

  it.each([
    ['evil.example/x', '/auth/v1/admin/users', 'POST'],
    ['abcdefghijklmnopqrs', '/auth/v1/admin/users', 'POST'],
    [REF, '/auth/v1/admin/users', 'GET'],
    [REF, '/auth/v1/admin/users/123', 'POST'],
    [REF, '/v1/projects', 'POST'],
  ])('rejects auth ref=%s path=%s %s', async (ref, path, method) => {
    const spy = mockUpstream()
    const res = await call(
      `ref=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}`,
      {
        method,
        body: method === 'GET' ? undefined : '{}',
      },
    )
    expect(res.status).toBe(403)
    expect(spy).not.toHaveBeenCalled()
  })

  it('caps the request body', async () => {
    const spy = mockUpstream()
    const res = await call(
      `path=${encodeURIComponent(`/v1/projects/${REF}/database/query`)}`,
      {
        method: 'POST',
        body: 'x'.repeat(256 * 1024 + 1),
      },
    )
    expect(res.status).toBe(413)
    expect(spy).not.toHaveBeenCalled()
  })

  it('reports an upstream timeout without echoing details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new DOMException('t', 'TimeoutError'))),
    )
    const res = await call('path=%2Fv1%2Forganizations')
    expect(res.status).toBe(504)
    expect(await res.json()).toEqual({
      message: 'Supabase did not respond in time.',
    })
  })

  it('does not log', async () => {
    const log = vi.spyOn(console, 'log')
    const error = vi.spyOn(console, 'error')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('boom'))),
    )
    const res = await call('path=%2Fv1%2Forganizations', {
      headers: { authorization: 'Bearer secret' },
    })
    expect(res.status).toBe(502)
    expect(log).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})

describe('api/supabase origin and response type', () => {
  it('rejects cross-site browser requests', async () => {
    const spy = mockUpstream()
    const res = await call('path=%2Fv1%2Forganizations', {
      headers: { 'sec-fetch-site': 'cross-site' },
    })
    expect(res.status).toBe(403)
    expect(spy).not.toHaveBeenCalled()
  })

  it('always answers JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('<script>x</script>', {
            headers: { 'content-type': 'text/html' },
          }),
      ),
    )
    const res = await call('path=%2Fv1%2Forganizations', {
      headers: { 'sec-fetch-site': 'same-origin' },
    })
    expect(res.headers.get('content-type')).toBe('application/json')
  })
})
