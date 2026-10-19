import { ConfirmReuseError } from './context'
import type { DeployContext } from './context'
import * as supabase from './supabase'
import * as vercel from './vercel'

export interface DeployStep {
  id: string
  label: string
  run: (ctx: DeployContext) => Promise<void>
}

/**
 * Supabase project first, with sign-ups turned off before anything is public,
 * and the schema; then the Vercel project and deploy, so the real production
 * domain is known; then the full auth config is pushed once with that domain;
 * the owner last, once Auth has had time to come up.
 */
export const STEPS: Array<DeployStep> = [
  { id: 'names', label: 'Check the project name', run: vercel.checkName },
  {
    id: 'project',
    label: 'Create the Supabase project',
    run: supabase.findOrCreateProject,
  },
  {
    id: 'healthy',
    label: 'Wait for the project to start',
    run: supabase.waitForHealthy,
  },
  { id: 'lock', label: 'Turn off sign-ups', run: supabase.lockSignups },
  { id: 'schema', label: 'Set up the database', run: supabase.applySchema },
  {
    id: 'storage',
    label: 'Create photo storage and API settings',
    run: supabase.configureStorageAndApi,
  },
  { id: 'keys', label: 'Read the project keys', run: supabase.readApiKeys },
  {
    id: 'vercel-project',
    label: 'Create the Vercel project',
    run: vercel.ensureProject,
  },
  { id: 'env', label: 'Set environment variables', run: vercel.setEnvironment },
  { id: 'upload', label: 'Upload the app source', run: vercel.uploadSource },
  { id: 'deploy', label: 'Build and deploy the app', run: vercel.deploy },
  { id: 'domain', label: 'Read the app URL', run: vercel.readProductionDomain },
  { id: 'auth', label: 'Configure sign-in', run: supabase.pushAuthConfig },
  { id: 'owner', label: 'Create your account', run: supabase.createOwner },
]

export type StepStatus = 'pending' | 'running' | 'done' | 'error'

/**
 * Runs every step not in `done`, in order, and stops at the first failure.
 * Calling it again with the same `done` set and context resumes from there.
 */
export async function runDeploy(
  ctx: DeployContext,
  done: Set<string>,
  onStatus: (
    id: string,
    status: StepStatus,
    error?: string,
    needsConfirm?: boolean,
  ) => void,
): Promise<boolean> {
  for (const step of STEPS) {
    if (done.has(step.id)) continue
    onStatus(step.id, 'running')
    try {
      await step.run(ctx)
    } catch (error) {
      onStatus(
        step.id,
        'error',
        error instanceof Error ? error.message : 'Something went wrong.',
        error instanceof ConfirmReuseError,
      )
      return false
    }
    done.add(step.id)
    onStatus(step.id, 'done')
  }
  return true
}
