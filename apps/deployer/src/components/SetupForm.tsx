import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'

import { describedBy, ExternalLink, Field, TextField } from '#/components/Field'
import { Button } from '#/components/ui/button'
import { supabaseApi } from '#/lib/api'
import type { DeployInput, Errors } from '#/lib/form'
import {
  MIN_PASSWORD_LENGTH,
  pickOrgSlug,
  REGIONS,
  STEPS,
  validateStep,
} from '#/lib/form'
import { cn } from '#/lib/utils'

interface Organization {
  id: string
  slug: string
  name: string
}

type OrgState =
  | { status: 'idle' | 'loading' }
  | { status: 'ok'; orgs: Array<Organization> }
  | { status: 'error'; message: string }

/** Loads the token's organizations once typing pauses */
function useOrganizations(token: string): OrgState {
  const [state, setState] = useState<OrgState>({ status: 'idle' })
  useEffect(() => {
    // Clear the previous token's list at once so its org cannot be submitted
    setState({ status: 'idle' })
    const trimmed = token.trim()
    if (!trimmed) return
    let live = true
    const timer = setTimeout(() => {
      setState({ status: 'loading' })
      supabaseApi<Array<Organization>>(trimmed, 'GET', '/v1/organizations')
        .then((orgs) => live && setState({ status: 'ok', orgs }))
        .catch(
          (e: Error) =>
            live && setState({ status: 'error', message: e.message }),
        )
    }, 500)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [token])
  return state
}

const NO_ORGS: Array<Organization> = []

const selectClass =
  'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive md:text-sm'

const EXPIRING =
  'Pick a short expiry (a day is plenty). The token is only needed while the deploy runs.'

interface SetupFormProps {
  input: DeployInput
  onChange: (patch: Partial<DeployInput>) => void
  review: React.ReactNode
}

export function SetupForm({ input, onChange, review }: SetupFormProps) {
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const headingRef = useRef<HTMLHeadingElement>(null)
  const orgs = useOrganizations(input.supabaseToken)
  const firstRender = useRef(true)

  // Move focus to the new step's heading so keyboard and screen-reader users land on it
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])

  // Keep the chosen org in step with the loaded list (first org by default)
  const orgList = orgs.status === 'ok' ? orgs.orgs : NO_ORGS
  const orgError =
    errors.orgSlug ?? (orgs.status === 'error' ? orgs.message : undefined)
  useEffect(() => {
    const slug = pickOrgSlug(orgList, input.orgSlug)
    if (slug !== input.orgSlug) onChange({ orgSlug: slug })
  }, [orgList, input.orgSlug, onChange])

  const set = (field: keyof DeployInput) => (value: string) => {
    onChange({ [field]: value })
    if (errors[field]) setErrors({ ...errors, [field]: undefined })
  }

  function next(e: React.FormEvent) {
    e.preventDefault()
    const found = validateStep(step, input)
    setErrors(found)
    let first = Object.keys(found)[0]
    // The org select is disabled until orgs load; the token field is where to fix that
    if (first === 'orgSlug' && orgList.length === 0) first = 'supabaseToken'
    if (first) {
      document.getElementById(first)?.focus()
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  return (
    <form onSubmit={next} noValidate className="space-y-6">
      <ol aria-label="Setup steps" className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((name, i) => (
          <li
            key={name}
            aria-current={i === step ? 'step' : undefined}
            className={cn(
              'rounded-full px-3 py-1',
              i === step
                ? 'bg-primary text-primary-foreground font-semibold'
                : i < step
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground',
            )}
          >
            {i + 1}. {name}
          </li>
        ))}
      </ol>

      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-xl font-semibold outline-none"
      >
        {STEPS[step]}
      </h2>

      {step === 0 && (
        <div className="space-y-5">
          <p className="text-muted-foreground text-sm">
            Supabase hosts your database, sign-in and photo storage. The free
            plan is enough for a family.
          </p>
          <TextField
            id="supabaseToken"
            label="Supabase access token"
            type="password"
            autoComplete="one-time-code"
            value={input.supabaseToken}
            onChange={set('supabaseToken')}
            error={errors.supabaseToken}
            hint="Starts with sbp_. Your organizations load once it is entered."
            help={
              <>
                <ol>
                  <li>
                    Sign in to Supabase (or create a free account), then open{' '}
                    <ExternalLink href="https://supabase.com/dashboard/account/tokens">
                      Account → Access Tokens
                    </ExternalLink>
                    .
                  </li>
                  <li>
                    Click <strong>Generate new token</strong> and name it
                    "family-space-deploy".
                  </li>
                  <li>Copy the token and paste it here.</li>
                </ol>
                <p>
                  {EXPIRING} Delete it from the same page when you are done.
                </p>
              </>
            }
          />

          <Field
            id="orgSlug"
            label="Organization"
            error={orgError}
            help={
              <p>
                Projects live in an organization. If the list is empty,{' '}
                <ExternalLink href="https://supabase.com/dashboard/new">
                  create an organization
                </ExternalLink>{' '}
                (the free plan works), then re-enter the token.
              </p>
            }
          >
            <div className="flex items-center gap-2">
              <select
                {...describedBy('orgSlug', orgError)}
                className={selectClass}
                value={input.orgSlug}
                disabled={orgList.length === 0}
                onChange={(e) => set('orgSlug')(e.target.value)}
              >
                {orgList.length === 0 && (
                  <option value="">
                    {orgs.status === 'loading'
                      ? 'Loading…'
                      : 'Enter the token first'}
                  </option>
                )}
                {orgList.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.name}
                  </option>
                ))}
              </select>
              {orgs.status === 'loading' && (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              )}
            </div>
            <span role="status" className="sr-only">
              {orgs.status === 'loading' ? 'Loading organizations…' : ''}
            </span>
          </Field>

          <Field
            id="region"
            label="Region"
            hint="Pick the one closest to your family. It cannot be changed later."
            error={errors.region}
          >
            <select
              {...describedBy('region', errors.region, true)}
              className={selectClass}
              value={input.region}
              onChange={(e) => set('region')(e.target.value)}
            >
              {REGIONS.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </Field>

          <TextField
            id="projectName"
            label="Project name"
            value={input.projectName}
            onChange={set('projectName')}
            error={errors.projectName}
            hint="Used for both the Supabase and the Vercel project. If a project with this name already exists, the deploy reuses it."
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <p className="text-muted-foreground text-sm">
            Vercel builds and hosts the web app. The free Hobby plan works.
          </p>
          <TextField
            id="vercelToken"
            label="Vercel token"
            type="password"
            autoComplete="one-time-code"
            value={input.vercelToken}
            onChange={set('vercelToken')}
            error={errors.vercelToken}
            help={
              <>
                <ol>
                  <li>
                    Sign in to Vercel (or create a free account), then open{' '}
                    <ExternalLink href="https://vercel.com/account/settings/tokens">
                      Account Settings → Tokens
                    </ExternalLink>
                    .
                  </li>
                  <li>
                    Name it "family-space-deploy", set the scope to the account
                    or team that should own the app, and choose an expiration.
                  </li>
                  <li>
                    Click <strong>Create</strong>, copy the token and paste it
                    here.
                  </li>
                </ol>
                <p>
                  {EXPIRING} Delete it from the same page when you are done.
                </p>
              </>
            }
          />
          <TextField
            id="vercelTeamId"
            label="Vercel team ID"
            optional
            value={input.vercelTeamId}
            onChange={set('vercelTeamId')}
            error={errors.vercelTeamId}
            hint="Leave blank to deploy to your personal account."
            placeholder="team_…"
            help={
              <ol>
                <li>
                  Open your team in the{' '}
                  <ExternalLink href="https://vercel.com/dashboard">
                    Vercel dashboard
                  </ExternalLink>
                  .
                </li>
                <li>
                  Go to <strong>Settings → General</strong> and copy the{' '}
                  <strong>Team ID</strong> (it starts with team_).
                </li>
              </ol>
            }
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <p className="text-muted-foreground text-sm">
            This is your own sign-in. The first account to sign in becomes the
            family owner. You add family members later from the Supabase
            dashboard.
          </p>
          <TextField
            id="ownerEmail"
            label="Your email"
            type="email"
            autoComplete="email"
            value={input.ownerEmail}
            onChange={set('ownerEmail')}
            error={errors.ownerEmail}
          />
          <TextField
            id="ownerPassword"
            label="Your password"
            type="password"
            autoComplete="new-password"
            value={input.ownerPassword}
            onChange={set('ownerPassword')}
            error={errors.ownerPassword}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters. You sign in to your Family Space with this.`}
          />
        </div>
      )}

      {step === 3 && review}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft aria-hidden /> Back
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 && (
          <Button type="submit">
            Next <ArrowRight aria-hidden />
          </Button>
        )}
      </div>
    </form>
  )
}
