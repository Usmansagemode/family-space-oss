import { ApiError } from '#/lib/api'
import type { DeployInput } from '#/lib/form'

export interface UploadedFile {
  file: string
  sha: string
  size: number
}

/** Results carried between steps. Kept in memory so Retry resumes where it stopped. */
export interface DeployState {
  ref?: string
  anonKey?: string
  serviceKey?: string
  vercelProjectId?: string
  files: Map<string, UploadedFile>
  deploymentId?: string
  appUrl?: string
  ownerExisted?: boolean
  /** The person agreed to deploy into a Supabase project that already existed */
  reuseConfirmed?: boolean
  /** The Supabase project existed before this run */
  reused?: boolean
}

export interface DeployContext {
  input: DeployInput
  state: DeployState
  /** Short progress line for the running step, e.g. "Uploaded 120 of 376 files" */
  note: (detail: string) => void
  sleep: (ms: number) => Promise<void>
}

export class DeployError extends Error {}

/** Stops the run until the person confirms reusing an existing project */
export class ConfirmReuseError extends DeployError {}

export function newState(): DeployState {
  return { files: new Map() }
}

/**
 * Retries calls that fail because a freshly started service is not answering
 * yet (network errors and 5xx). Anything else fails at once.
 */
export async function withRetry<T>(
  ctx: DeployContext,
  fn: () => Promise<T>,
  tries = 6,
  delayMs = 5_000,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const transient =
        error instanceof ApiError && (error.status === 0 || error.status >= 500)
      if (!transient || attempt >= tries) throw error
      await ctx.sleep(delayMs)
    }
  }
}
