export interface DeployInput {
  supabaseToken: string
  orgSlug: string
  region: string
  projectName: string
  vercelToken: string
  vercelTeamId: string
  ownerEmail: string
  ownerPassword: string
}

export type Field = keyof DeployInput
export type Errors = Partial<Record<Field, string>>

export const EMPTY_INPUT: DeployInput = {
  supabaseToken: '',
  orgSlug: '',
  region: 'us-east-1',
  projectName: 'family-space',
  vercelToken: '',
  vercelTeamId: '',
  ownerEmail: '',
  ownerPassword: '',
}

// The regions POST /v1/projects accepts
export const REGIONS: Array<[string, string]> = [
  ['us-east-1', 'US East (N. Virginia)'],
  ['us-east-2', 'US East (Ohio)'],
  ['us-west-1', 'US West (N. California)'],
  ['us-west-2', 'US West (Oregon)'],
  ['ca-central-1', 'Canada (Central)'],
  ['sa-east-1', 'South America (São Paulo)'],
  ['eu-west-1', 'EU West (Ireland)'],
  ['eu-west-2', 'EU West (London)'],
  ['eu-west-3', 'EU West (Paris)'],
  ['eu-north-1', 'EU North (Stockholm)'],
  ['eu-central-1', 'EU Central (Frankfurt)'],
  ['eu-central-2', 'EU Central (Zurich)'],
  ['ap-south-1', 'Asia Pacific (Mumbai)'],
  ['ap-southeast-1', 'Asia Pacific (Singapore)'],
  ['ap-southeast-2', 'Asia Pacific (Sydney)'],
  ['ap-northeast-1', 'Asia Pacific (Tokyo)'],
  ['ap-northeast-2', 'Asia Pacific (Seoul)'],
  ['ap-east-1', 'Asia Pacific (Hong Kong)'],
]

// supabase/config.toml [auth] minimum_password_length
export const MIN_PASSWORD_LENGTH = 6

export const STEPS = ['Supabase', 'Vercel', 'Owner', 'Review'] as const

const STEP_FIELDS: Array<Array<Field>> = [
  ['supabaseToken', 'orgSlug', 'region', 'projectName'],
  ['vercelToken', 'vercelTeamId'],
  ['ownerEmail', 'ownerPassword'],
  [],
]

function check(field: Field, v: DeployInput): string | undefined {
  switch (field) {
    case 'supabaseToken':
      return v.supabaseToken.trim()
        ? undefined
        : 'Enter your Supabase access token.'
    case 'orgSlug':
      return v.orgSlug ? undefined : 'Choose an organization.'
    case 'region':
      return REGIONS.some(([id]) => id === v.region)
        ? undefined
        : 'Choose a region.'
    case 'projectName':
      // Vercel's project-name rules, which are stricter than Supabase's
      return /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/.test(v.projectName)
        ? undefined
        : 'Use 1–40 lowercase letters, numbers and hyphens, not starting or ending with a hyphen.'
    case 'vercelToken':
      return v.vercelToken.trim() ? undefined : 'Enter your Vercel token.'
    case 'vercelTeamId':
      return !v.vercelTeamId || /^team_[A-Za-z0-9]+$/.test(v.vercelTeamId)
        ? undefined
        : 'A team ID starts with "team_". Leave it blank for your personal account.'
    case 'ownerEmail':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.ownerEmail)
        ? undefined
        : 'Enter a valid email address.'
    case 'ownerPassword':
      return v.ownerPassword.length >= MIN_PASSWORD_LENGTH
        ? undefined
        : `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
}

export function validateStep(step: number, v: DeployInput): Errors {
  const errors: Errors = {}
  for (const field of STEP_FIELDS[step] ?? []) {
    const message = check(field, v)
    if (message) errors[field] = message
  }
  return errors
}

export function validateAll(v: DeployInput): Errors {
  return STEP_FIELDS.reduce<Errors>(
    (all, _, step) => ({ ...all, ...validateStep(step, v) }),
    {},
  )
}

/** The org to submit: the current one if the loaded list has it, else the first, else none */
export function pickOrgSlug(
  orgs: Array<{ slug: string }>,
  current: string,
): string {
  return orgs.some((o) => o.slug === current) ? current : (orgs[0]?.slug ?? '')
}
