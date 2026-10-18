import { createServerFn } from '@tanstack/react-start'

export const refreshGoogleToken = createServerFn({ method: 'POST' })
  .inputValidator((input: { refreshToken: string }) => input)
  .handler(async ({ data }) => {
    const clientId = process.env['GOOGLE_CLIENT_ID']
    const clientSecret = process.env['GOOGLE_CLIENT_SECRET']

    if (!clientId || !clientSecret) return null

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: data.refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!res.ok) return null
    const json = (await res.json()) as { access_token?: string }
    return json.access_token ?? null
  })
