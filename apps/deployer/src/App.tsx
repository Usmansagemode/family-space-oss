import { useCallback, useEffect, useRef, useState } from 'react'
import { Rocket } from 'lucide-react'

import { Done } from '#/components/Done'
import { Progress } from '#/components/Progress'
import { SetupForm } from '#/components/SetupForm'
import { Button } from '#/components/ui/button'
import type { DeployState } from '#/deploy/context'
import { newState } from '#/deploy/context'
import type { StepStatus } from '#/deploy/run'
import { runDeploy } from '#/deploy/run'
import type { DeployInput } from '#/lib/form'
import { EMPTY_INPUT, REGIONS, validateAll } from '#/lib/form'

type Phase = 'form' | 'deploy' | 'done'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// What identifies the resources a run creates; changing it starts over
const runKey = (v: DeployInput) =>
  JSON.stringify([v.projectName, v.orgSlug, v.region, v.vercelTeamId])

export function App() {
  // Tokens and the password live only in this state: never in storage or the URL
  const [input, setInput] = useState<DeployInput>(EMPTY_INPUT)
  const onChange = useCallback(
    (patch: Partial<DeployInput>) => setInput((v) => ({ ...v, ...patch })),
    [],
  )
  const [phase, setPhase] = useState<Phase>('form')
  const [statuses, setStatuses] = useState<Record<string, StepStatus>>({})
  const [detail, setDetail] = useState('')
  const [error, setError] = useState('')
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{
    appUrl: string
    ownerEmail: string
    ownerExisted: boolean
    reused: boolean
  }>()

  // Survives Retry and "Edit details" so a re-run resumes instead of repeating work
  const run = useRef<{ key: string; state: DeployState; done: Set<string> }>(
    null,
  )

  useEffect(() => {
    if (!running) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [running])

  async function deploy() {
    if (Object.keys(validateAll(input)).length) return
    if (run.current?.key !== runKey(input)) {
      run.current = { key: runKey(input), state: newState(), done: new Set() }
      setStatuses({})
    }
    const { state, done } = run.current
    setPhase('deploy')
    setError('')
    setNeedsConfirm(false)
    setRunning(true)
    const ok = await runDeploy(
      { input, state, note: setDetail, sleep },
      done,
      (id, status, message, confirm) => {
        setStatuses((s) => ({ ...s, [id]: status }))
        setDetail('')
        if (message) setError(message)
        if (confirm) setNeedsConfirm(true)
      },
    )
    setRunning(false)
    if (!ok) return
    setResult({
      appUrl: state.appUrl ?? '',
      ownerEmail: input.ownerEmail,
      ownerExisted: Boolean(state.ownerExisted),
      reused: Boolean(state.reused),
    })
    // Nothing is needed any more: drop the tokens, keys and password from memory
    run.current = null
    setInput(EMPTY_INPUT)
    setPhase('done')
  }

  const review = (
    <div className="space-y-6">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Project name</dt>
        <dd className="break-all">{input.projectName}</dd>
        <dt className="text-muted-foreground">Supabase organization</dt>
        <dd className="break-all">{input.orgSlug}</dd>
        <dt className="text-muted-foreground">Region</dt>
        <dd>{REGIONS.find(([id]) => id === input.region)?.[1]}</dd>
        <dt className="text-muted-foreground">Vercel</dt>
        <dd className="break-all">
          {input.vercelTeamId || 'Personal account'}
        </dd>
        <dt className="text-muted-foreground">Owner</dt>
        <dd className="break-all">{input.ownerEmail}</dd>
      </dl>
      <p className="text-muted-foreground text-sm">
        Deploying creates (or reuses) a Supabase project and a Vercel project
        with this name, sets up the database, deploys the app and creates your
        account.
      </p>
      <Button type="button" size="lg" onClick={deploy}>
        <Rocket aria-hidden /> Deploy
      </Button>
    </div>
  )

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Deploy your own Family Space
        </h1>
        <p className="text-muted-foreground">
          Grocery lists, chores, a calendar and household finances for one
          family, running on your own free Supabase and Vercel accounts.
        </p>
      </header>
      <main className="bg-card text-card-foreground rounded-lg border p-5 shadow-sm sm:p-8">
        {phase === 'form' && (
          <SetupForm input={input} onChange={onChange} review={review} />
        )}
        {phase === 'deploy' && (
          <Progress
            statuses={statuses}
            detail={detail}
            error={error}
            running={running}
            needsConfirm={needsConfirm}
            onRetry={deploy}
            onConfirmReuse={() => {
              if (run.current) run.current.state.reuseConfirmed = true
              void deploy()
            }}
            onEdit={() => setPhase('form')}
          />
        )}
        {phase === 'done' && result && <Done {...result} />}
      </main>
      <footer className="text-muted-foreground mt-6 text-xs">
        Your tokens stay in this tab and are never stored. Vercel calls go
        straight to Vercel; Supabase calls pass through this site&apos;s
        forwarding function, which keeps and logs nothing.{' '}
        <a
          href="https://github.com/Usmansagemode/family-space-oss"
          target="_blank"
          rel="noreferrer noopener"
        >
          Source code
        </a>
      </footer>
    </div>
  )
}
