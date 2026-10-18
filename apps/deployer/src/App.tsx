import { useCallback, useState } from 'react'

import { SetupForm } from '#/components/SetupForm'
import type { DeployInput } from '#/lib/form'
import { EMPTY_INPUT, REGIONS } from '#/lib/form'

export function App() {
  // Tokens and the password live only in this state: never in storage or the URL
  const [input, setInput] = useState<DeployInput>(EMPTY_INPUT)
  const onChange = useCallback(
    (patch: Partial<DeployInput>) => setInput((v) => ({ ...v, ...patch })),
    [],
  )

  const review = (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">Supabase project</dt>
      <dd className="break-all">{input.projectName}</dd>
      <dt className="text-muted-foreground">Organization</dt>
      <dd className="break-all">{input.orgSlug}</dd>
      <dt className="text-muted-foreground">Region</dt>
      <dd>{REGIONS.find(([id]) => id === input.region)?.[1]}</dd>
      <dt className="text-muted-foreground">Vercel</dt>
      <dd className="break-all">{input.vercelTeamId || 'Personal account'}</dd>
      <dt className="text-muted-foreground">Owner</dt>
      <dd className="break-all">{input.ownerEmail}</dd>
    </dl>
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
        <SetupForm input={input} onChange={onChange} review={review} />
      </main>
      <footer className="text-muted-foreground mt-6 text-xs">
        Your tokens stay in this tab and are sent only to Supabase and Vercel.{' '}
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
