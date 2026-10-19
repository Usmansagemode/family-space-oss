# Self-hosting Family Space

One deployment serves one family. You run your own Supabase project (database,
auth, storage) and host the web app wherever you like; Vercel is the supported
path. Nobody can sign up: you create an account for each family member, and
every account joins the same family the first time it signs in.

## Deploy from the browser

<https://family-space-deploy.usmankm.com> deploys an instance with nothing
installed. You need free [Supabase](https://supabase.com) and
[Vercel](https://vercel.com) accounts. The page walks you through:

1. A Supabase access token, your organization, a region and a project name.
2. A Vercel token, and a team ID if the app should live in a team.
3. Your email and password, which become the owner account.

Clicking **Deploy** creates the Supabase project and applies the schema. It then
creates the photo storage bucket, deploys the web app to Vercel and configures
sign-in for the app's address. Last, it creates your account. The run takes 5–10
minutes. If a step fails, **Retry** continues from that step. Running it again
later with the same project name offers to reuse the existing projects. The result is the
same instance as `scripts/setup.sh` produces, with email/password sign-in.
Google sign-in can be added afterwards ([below](#google-sign-in-optional)).

Make the tokens expire after a day, and delete them when the deploy is done.

### What the deployer sees

The tokens and your password stay in the browser tab's memory; nothing is
saved. Vercel calls go straight from your browser to Vercel. Supabase only
accepts these calls from its own sites, so they pass through a small forwarding
function on the deployer's site (`apps/deployer/api/supabase.ts`). It sees the
Supabase token, the project's service key and the owner password in transit.
It only talks to Supabase, only allows the calls the deploy needs, and stores
and logs nothing.

Using the hosted copy means trusting its page as well: its JavaScript holds
every token and decides which code is deployed. A Supabase access token can
reach every project in your account, so use one that expires quickly. To
remove the hosted copy from the picture, run the deployer on your own machine:

```bash
npm install
cd apps/deployer && npm run dev   # http://localhost:5173
```

See [apps/deployer/README.md](../apps/deployer/README.md) for the exact API
calls and how they map to `setup.sh`.

## Command-line setup

Requirements:

- Node.js 20+ and npm
- A [Supabase](https://supabase.com) account
- A [Vercel](https://vercel.com) account, only if you want the script to deploy
- Docker, only for a local development stack (`--local`)

```bash
npm install
scripts/setup.sh
```

The script asks a few questions and then:

1. **Supabase project** — creates a new project (or links an existing one by
   ref) and waits until it is healthy. A new project gets a random database
   password.
2. **Schema** — runs `docs/schema.sql` only when the `public` schema has no
   tables. If the Family Space tables are already there it leaves the database
   alone; if other tables are there it stops. The schema file drops tables
   before rebuilding, so it must never run on a database with data.
3. **Storage** — creates the public `avatars` bucket (200 KB, JPEG/PNG/WebP).
4. **Auth config** — pushes `supabase/config.toml`: sign-ups disabled,
   email/password and Google sign-in, manual identity linking (for Settings →
   Account → Link Google), site URL and redirect URLs (including the mobile
   deep link `familyspace://auth`).
5. **`apps/web/.env`** — writes the project URL, anon key and service-role key.
6. **Owner account** — creates your user, already confirmed. Leave the password
   blank if you will only sign in with Google.
7. **Vercel (optional)** — links a project, sets the three environment
   variables, deploys to production, offers to use the deployed URL for auth
   redirects, and offers to log the Vercel CLI out.

Re-running is safe. Answers live in `scripts/.setup.local` (git-ignored, only
readable by you); a second run reuses the project and offers earlier answers
as defaults. The script never prints keys or passwords. If the CLI is used for
Vercel, the script always offers to log it out before exiting, even after an
error.

### Why the Supabase CLI

The script drives the official Supabase CLI (pinned through `npx`), which wraps
the Management API: it creates and links projects, pushes auth config from a
checked-in `config.toml`, runs SQL and seeds storage buckets. The same
`config.toml` drives the local Docker stack, so local and hosted auth settings
come from one file. Terraform's Supabase provider covers project and settings
resources but not running the schema, creating users or storage buckets, so it
would still need the CLI or API calls for half the work, plus state to manage.

## Google sign-in (optional)

"Continue with Google" needs a Google OAuth client. Google offers no API to
create one, so this is a manual step for either setup path.

1. In [Google Cloud Console](https://console.cloud.google.com) → **APIs &
   Services** → **OAuth consent screen**, set up an External app with your app
   name and a contact email. Only the default `email`, `profile` and `openid`
   scopes are needed.
2. **Credentials** → **Create credentials** → **OAuth client ID** → **Web
   application**.
   - Authorized JavaScript origins: your app URL (and `http://localhost:3000`).
   - Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Turn the provider on with the client ID and secret:
   - **Deployed from the browser:** Supabase dashboard → **Authentication** →
     **Sign In / Providers** → **Google**. Enable it and paste the client ID
     and secret.
   - **`scripts/setup.sh`:** the script asks for them. If you skipped Google,
     re-run the script; it asks again.

While the consent screen is in "Testing" mode, add each family member's Google
address as a test user, or publish the app.

## Adding family members

Sign in as the owner first: whoever signs in first on an empty database
becomes the owner.

1. Supabase dashboard → **Authentication** → **Users** → **Add user** →
   **Create new user**.
2. Enter their email. To sign in with Google it must be the **exact** Google
   account address.
3. Set a password. For Google-only users, use a long random one; they never
   need it.
4. Tick **Auto Confirm User**. Sign-ups are disabled, so unconfirmed accounts
   have no way to confirm themselves.
5. Send them the app URL. On first sign-in they join the family as a member,
   get their own "Paid by" person, and appear in the activity feed.

Google sign-in links to the existing account with the same email; it does not
create a new one, because sign-ups are disabled.

## How the single family works

- The first person to sign in on an empty database becomes the **owner**. A
  family is created with default categories, and the owner goes through
  onboarding (family name, currency, people, stores).
- Everyone who signs in afterwards joins that family as a **member** and skips
  onboarding. A member who signs in before the owner finishes onboarding lands
  on the board; the family keeps the default name and currency until the owner
  completes it.
- The database allows only one `families` row.
- **Removing a member** (Settings → Members) bans their account so they cannot
  sign in again, and turns their person into a "Paid by" option so expense
  history stays intact. To let them back in, delete the user in the dashboard
  and create them again.
- **Delete account** (Settings → Account) removes the user. An owner can only
  delete their account while they are the family's only member; deleting it
  then deletes the family and all its data.

## Settings that must stay as they are

In the Supabase dashboard (all set by `config.toml`):

- **Authentication → Sign In / Providers → Allow new users to sign up:** off.
  Turning it on would let anyone with the URL join your family.
- **Allow anonymous sign-ins:** off.
- **Email provider:** on. In `config.toml` this is `[auth.email]
  enable_signup = true`; setting it to `false` disables email/password sign-in
  entirely.

## AI PDF import

Import → AI PDF Processing sends a bank statement to Google Gemini. Each user
adds their own Gemini API key under Settings → Integrations; it is stored in
that browser only.

## Local development stack

```bash
scripts/setup.sh --local
npm run dev
```

This starts Supabase in Docker with the same `config.toml`, applies the
schema, writes `apps/web/.env` with the local keys and creates the owner.
Google sign-in needs an OAuth client whose redirect URI is
`http://127.0.0.1:54321/auth/v1/callback`; set
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` before running the script. Without them
the Google button does not work locally; use email sign-in.

## Hosting the web app yourself

The web app is a TanStack Start (Vite + Nitro) app in `apps/web`, built with
the Vercel preset. It needs three environment variables (see `.env.example`):

| Variable | Where it is used |
|---|---|
| `VITE_SUPABASE_URL` | Browser and server |
| `VITE_SUPABASE_ANON_KEY` | Browser and server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only: Delete account, Remove member |

See [deployment.md](deployment.md) for the Vercel settings and the mobile app.

## Upgrading

1. Redeploy the web app with the new code. For an instance made with the
   deployer, run the deployer again with the same project name and confirm
   reusing the project: it deploys the current code to the same Vercel project
   and keeps the database and the sign-in settings, including the site URL and
   any Google sign-in. Otherwise, pull the new code and
   redeploy.
2. Run each new file in `docs/migrations/` in order in the Supabase SQL Editor.
   `select * from schema_migrations order by version;` shows what has run.

Neither the deployer nor `scripts/setup.sh` re-applies `docs/schema.sql` to an
existing database.
