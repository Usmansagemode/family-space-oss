// Fetch helpers that turn API failures into messages a person can act on.
// Tokens travel only in request headers and are never logged.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly data: unknown = null,
  ) {
    super(message)
  }
}

function detailOf(data: unknown): string {
  if (typeof data === 'string') return data.slice(0, 300)
  if (!data || typeof data !== 'object') return ''
  const d = data as Record<string, unknown>
  const nested = d.error as Record<string, unknown> | string | undefined
  const value =
    d.message ??
    d.msg ??
    d.error_description ??
    (typeof nested === 'object' ? nested.message : nested)
  return typeof value === 'string' ? value : ''
}

export function describeError(
  service: string,
  status: number,
  data: unknown,
): string {
  const detail = detailOf(data)
  if (status === 401) {
    return `${service} rejected the token. Check it is correct and has not expired.`
  }
  if (status === 429) {
    return `${service} is limiting requests. Wait a minute, then retry.`
  }
  return `${service} returned an error (HTTP ${status})${detail ? `: ${detail}` : '.'}`
}

export async function requestJson<T>(
  service: string,
  url: string,
  init: RequestInit,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new ApiError(
      `Could not reach ${service}. Check your connection, then retry.`,
      0,
    )
  }
  const text = await res.text()
  let data: unknown = text
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // non-JSON body: keep the text for the error message
  }
  if (!res.ok) {
    throw new ApiError(
      describeError(service, res.status, data),
      res.status,
      data,
    )
  }
  return data as T
}

function jsonInit(
  method: string,
  headers: Record<string, string>,
  body?: unknown,
): RequestInit {
  if (body === undefined) return { method, headers }
  return {
    method,
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

/** Supabase Management API, through api/supabase.ts */
export function supabaseApi<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  return requestJson<T>(
    'Supabase',
    `/api/supabase?path=${encodeURIComponent(path)}`,
    jsonInit(method, { authorization: `Bearer ${token}` }, body),
  )
}
