# Self-hosting Family Space

One deployment serves one family. You run your own Supabase project (database,
auth, storage) and host the web app wherever you like; Vercel is the supported
path. Nobody can sign up: you create an account for each family member, and
every account joins the same family the first time it signs in.

## Requirements

- Node.js 20+ and npm
- A [Supabase](https://supabase.com) account
- A Google Cloud project, only if you want "Continue with Google"
- A [Vercel](https://vercel.com) account, only if you want the script to deploy
- Docker, only for a local development stack (`--local`)

## One-command setup

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

### What it cannot do for you

**Create the Google OAuth client.** Google offers no API for it.

1. In [Google Cloud Console](https://console.cloud.google.com) → **APIs &
   Services** → **OAuth consent screen**, set up an External app with your app
   name and a contact email. Only the default `email`, `profile` and `openid`
   scopes are needed.
2. **Credentials** → **Create credentials** → **OAuth client ID** → **Web
   application**.
   - Authorized JavaScript origins: your app URL (and `http://localhost:3000`).
   - Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Give the client ID and secret to `scripts/setup.sh`. If you skipped Google,
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

1. Pull the new code and redeploy the web app.
2. Run each new file in `docs/migrations/` in order in the Supabase SQL Editor.
   `select * from schema_migrations order by version;` shows what has run.

`scripts/setup.sh` never re-applies `docs/schema.sql` to an existing database.
