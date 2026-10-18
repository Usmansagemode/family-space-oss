import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

// `vite dev` serves api/supabase.ts too, so the deployer runs fully locally
function localApi(): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api/supabase', async (req, res, next) => {
        try {
          const mod = await server.ssrLoadModule('/api/supabase.ts')
          const chunks: Array<Buffer> = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') headers.set(k, v)
          }
          const response: Response = await mod.default.fetch(
            new Request(new URL(req.originalUrl ?? '/', 'http://localhost'), {
              method: req.method,
              headers,
              body: chunks.length ? Buffer.concat(chunks) : undefined,
            }),
          )
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), viteReact(), localApi()],
  resolve: { alias: { '#': fileURLToPath(new URL('./src', import.meta.url)) } },
})
