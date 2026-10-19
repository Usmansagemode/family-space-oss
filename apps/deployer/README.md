# Family Space deployer

A single-page app that deploys a Family Space instance from the browser: it
creates the Supabase project, sets up the database, deploys `apps/web` to
Vercel and creates the owner account. It produces the same instance as
`scripts/setup.sh` in hosted mode, with email/password sign-in. The public copy
runs at <https://family-space-deploy.usmankm.com>.

## How it works

The browser runs the deploy (`src/deploy/`). Every step is idempotent and its
results are kept in memory, so **Retry** resumes from the step that failed. A
page reload loses that memory. Running again then finds the Supabase and Vercel
projects by name instead of creating duplicates, skips the schema if it is
already complete, and leaves an existing owner account unchanged.

A same-named project may be someone's live instance, so reuse is never silent.
If the Supabase project was not created in the current run, the deploy stops
and asks the person to confirm. A Vercel project is reused only when its root
directory is `apps/web` and its production `VITE_SUPABASE_URL` is unset or
points at the same Supabase project. A value Vercel will not return (a
sensitive variable) cannot be checked and is not treated as a mismatch.

| Order | Step                                     | Call                                                                                                                                                       |
| ----- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Check the project name                   | `GET /v9/projects/{name}` on Vercel: stop before creating anything if an unrelated project has the name                                                    |
| 1     | Find or create the Supabase project      | `GET /v1/projects`, else `POST /v1/projects` (`organization_slug`, `region`, random `db_pass`)                                                             |
| 2     | Wait until healthy                       | `GET /v1/projects/{ref}` until `status` is `ACTIVE_HEALTHY` (10 s × 60)                                                                                    |
| 2b    | Turn off sign-ups                        | `PATCH /v1/projects/{ref}/config/auth` (`disable_signup`, `external_anonymous_users_enabled: false`)                                                       |
| 3     | Schema                                   | `POST /v1/projects/{ref}/database/query`: guard query, then `docs/schema.sql` as one request                                                               |
| 4     | Avatars bucket, API and storage settings | SQL upsert into `storage.buckets`; `PATCH /v1/projects/{ref}/postgrest`; `PATCH /v1/projects/{ref}/config/storage`                                         |
| 5     | API keys                                 | `GET /v1/projects/{ref}/api-keys?reveal=true`                                                                                                              |
| 6     | Vercel project                           | `GET /v9/projects/{name}`, else `POST /v11/projects` (root directory `apps/web`)                                                                           |
| 7     | Environment variables                    | `GET /v10/projects/{id}/env?decrypt=true` (ownership check), then `POST /v10/projects/{id}/env?upsert=true`                                                |
| 8     | Upload the source                        | GitHub `GET /repos/{repo}/git/trees/{sha}?recursive=1`, each file from `raw.githubusercontent.com` (checked against the tree's blob SHA), `POST /v2/files` |
| 9     | Deploy                                   | `POST /v13/deployments` (`target: production`), then `GET /v13/deployments/{id}` until `READY`                                                             |
| 10    | App URL                                  | `GET /v9/projects/{id}/domains?production=true`                                                                                                            |
| 11    | Auth settings                            | `GET` then `PATCH /v1/projects/{ref}/config/auth`                                                                                                          |
| 12    | Owner account                            | `POST https://{ref}.supabase.co/auth/v1/admin/users` (`email_confirm: true`)                                                                               |

The full auth settings come after the Vercel deploy because the site URL and
redirect allow-list need the project's real production domain. That way they
are pushed once, with the right value. The app is public from the moment it
deploys, and whoever signs in first on an empty database becomes the owner, so
sign-ups are turned off (step 2b) as soon as the project is up. `setup.sh` gets
the same guarantee by pushing its config before it deploys.

### Parity with `scripts/setup.sh`

| `setup.sh` (hosted) / `supabase/config.toml`                                    | Deployer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `projects create --org-id --region --db-password`                               | Step 1. The password is generated in the browser, sent once and never kept: the deployer runs SQL through the Management API, so it never needs the password again.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Wait for `ACTIVE_HEALTHY`                                                       | Step 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Schema only when `public` has no tables; skip if `families` exists              | Step 3. The guard also checks for the last object `docs/schema.sql` creates (the `avatars_select` storage policy), so a partly applied schema stops the deploy instead of being skipped. The file is sent as one request, which Postgres runs as one implicit transaction, so a failure leaves the database empty. It has no explicit `BEGIN`/`COMMIT`: a statement failing before the `COMMIT` would leave a pooled connection inside an aborted transaction.                                                                                                                                                                                                                                                                                                     |
| `seed buckets` (`[storage.buckets.avatars]`: public, 200 KiB, JPEG/PNG/WebP)    | Step 4, `insert … on conflict do update` with the same values                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `[api]` schemas, `extra_search_path`, `max_rows`                                | Step 4, `postgrest` PATCH                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `[storage]` `file_size_limit = "50MiB"`, `s3_protocol`                          | Step 4, storage PATCH (`fileSizeLimit`, `features.s3Protocol`). Analytics and vector buckets are disabled in `config.toml`, which `config push` treats as "leave the platform default". The deployer does the same.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `projects api-keys`: legacy `anon`/`service_role`, else `publishable`/`secret`  | Step 5, same fallback                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `vercel link` with root directory `apps/web`; three production env vars         | Steps 6–7. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are encrypted; `SUPABASE_SERVICE_ROLE_KEY` is sensitive.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `vercel deploy --prod`                                                          | Steps 8–9: the whole repository at the deployer's own commit, framework `tanstack-start`, root directory `apps/web`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `config push` `[auth]` with `SITE_URL`, Google off when no client is given      | Step 11. Same fields `config push` sends: site URL; redirect list (site URL, `http://localhost:3000`, `familyspace://auth`); sign-ups off; anonymous sign-ins off; manual linking on; password length 6; JWT expiry; refresh-token rotation; rate limits; MFA; email and SMS settings. OAuth providers are not sent: they are off on a new project. A project whose site URL is already a real address (a live instance being redeployed) gets only the redirect list and the sign-up lock, so its own settings (password rules, rate limits, MFA, Google sign-in, site URL) are kept. Existing redirect URLs always stay in the list. `http://localhost:3000` stays in the list as in `config.toml`, so a local copy of the app can sign in against the instance. |
| Owner via `POST /auth/v1/admin/users`; `422 email_exists` leaves the user alone | Step 12. `sb_secret_` keys go in `apikey` only, legacy JWT keys in `apikey` and `Authorization`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Google sign-in is not part of the deployer. To add it later, see
[docs/self-hosting.md](../../docs/self-hosting.md#google-sign-in-optional).

### Source pinning

`vite.config.ts` bakes in the repository (`SOURCE_REPO`, default
`Usmansagemode/family-space-oss`) and the commit to deploy: `SOURCE_REF`, else
Vercel's `VERCEL_GIT_COMMIT_SHA`, else `HEAD`. A tag or branch in `SOURCE_REF`
is resolved to its commit SHA at build time, because a name could later point
somewhere else. `docs/schema.sql` is imported at build time from the same
checkout. So the app a person deploys
and the schema applied to their database always come from the same commit. The
commit must be on GitHub: files are read from `raw.githubusercontent.com`, which
works for any Vercel account because the repository is public.

## The forwarding function

`api/supabase.ts` relays Supabase calls, because the Management API only
accepts browser requests from Supabase's own sites, and the Auth admin API
refuses `sb_secret_` keys from browsers. Vercel's API allows any origin, so
Vercel calls go straight from the browser.

The function:

- only reaches `api.supabase.com`, plus `<ref>.supabase.co` for
  `POST /auth/v1/admin/users`, where the ref must match `^[a-z]{20}$`;
- allows only the methods and paths in the table above;
- forwards only the `Authorization`, `Content-Type` and `apikey` headers;
- caps request bodies at 256 KB and waits at most 50 s for Supabase;
- returns no CORS headers, refuses cross-site browser requests, and does not
  follow redirects;
- stores nothing and logs nothing.

### What you trust when using the hosted copy

- The page's JavaScript holds every token and the password, and it decides
  which commit gets deployed. Whoever controls the hosted deployment controls
  both.
- The forwarding function sees the Supabase access token, the project's
  service key and the owner password in transit, because it forwards them.
  On a reused project it also sees the project's auth config, which includes
  provider secrets, when the deploy reads the current site URL.
- A Supabase access token covers every project in the account, not just the
  new one. A Vercel token covers its whole scope. That is why the help text
  recommends tokens that expire within a day, deleted afterwards.

Running the deployer locally (below) takes the hosted copy out of the picture:
the page and the function then run from a checkout you can read.

## Run it locally

```bash
npm install
cd apps/deployer
npm run dev
```

`npm run dev` serves the app and `api/supabase.ts` (through a Vite dev
middleware) at <http://localhost:5173>. The deploy uses the commit checked out
locally, which must exist on GitHub.

| Command         |                                                                       |
| --------------- | --------------------------------------------------------------------- |
| `npm run build` | Typecheck and build to `dist/`                                        |
| `npm run test`  | Unit tests: forwarding-function allowlist, step order, resume, guards |
| `npm run lint`  | ESLint                                                                |

## Vercel project settings

The deployer is its own Vercel project, connected to this repository:

| Setting                                  | Value                                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root Directory                           | `apps/deployer`                                                                                                                                               |
| Include files outside the Root Directory | On (the build reads `docs/schema.sql`)                                                                                                                        |
| Framework Preset                         | Vite                                                                                                                                                          |
| Build Command                            | `npm run build` (default)                                                                                                                                     |
| Output Directory                         | `dist` (default)                                                                                                                                              |
| Install Command                          | default (`npm install`, run at the workspace root)                                                                                                            |
| Node.js version                          | 20 or later                                                                                                                                                   |
| Environment variables                    | None required. `VERCEL_GIT_COMMIT_SHA` must be exposed (Vercel's default for Git deployments). Optional: `SOURCE_REPO` for a fork, `SOURCE_REF` to pin a tag. |
| Domain                                   | `family-space-deploy.usmankm.com`                                                                                                                             |
| Firewall                                 | A rate-limit rule on `/api/supabase` keyed on IP (for example 60 requests per minute), so the function cannot be used as a free relay                         |
| Git fork protection                      | On (the default), so a pull request from a fork cannot deploy changed deployer code without approval                                                          |

`vercel.json` sets the function's `maxDuration` (60 s), the SPA rewrite (every
path except `/api/`) and the security headers, including a CSP that limits
connections to this origin, `api.vercel.com`, `api.github.com` and
`raw.githubusercontent.com`.
