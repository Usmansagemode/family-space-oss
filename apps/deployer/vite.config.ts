import { execFileSync } from 'node:child_process'
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

// The app source is deployed from the same commit the deployer is built from,
// so the uploaded code matches the bundled docs/schema.sql. Always a full
// commit SHA: a branch or tag could move after the build.
function sourceRef(): string {
  const given = process.env.SOURCE_REF || process.env.VERCEL_GIT_COMMIT_SHA
  if (given && /^[0-9a-f]{40}$/.test(given)) return given
  if (given && !/^\w[\w.\-/]*$/.test(given)) {
    throw new Error(`Invalid SOURCE_REF: ${given}`)
  }
  // A tag or branch name, or nothing (HEAD): resolve it in this checkout
  const sha = execFileSync(
    'git',
    ['rev-parse', '--verify', `${given || 'HEAD'}^{commit}`],
    { encoding: 'utf8' },
  ).trim()
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`Cannot resolve ${given}`)
  return sha
}

function sourceRepo(): string {
  const repo = process.env.SOURCE_REPO || 'Usmansagemode/family-space-oss'
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repo)) {
    throw new Error(`Invalid SOURCE_REPO: ${repo}`)
  }
  return repo
}

export default defineConfig({
  define: {
    __SOURCE_REPO__: JSON.stringify(sourceRepo()),
    __SOURCE_REF__: JSON.stringify(sourceRef()),
  },
  plugins: [tailwindcss(), viteReact(), localApi()],
  resolve: { alias: { '#': fileURLToPath(new URL('./src', import.meta.url)) } },
})
