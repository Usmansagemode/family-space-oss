import { useEffect, useRef } from 'react'
import { CheckCircle2, Circle, Loader2, RotateCcw, XCircle } from 'lucide-react'

import { Button } from '#/components/ui/button'
import type { StepStatus } from '#/deploy/run'
import { STEPS } from '#/deploy/run'
import { cn } from '#/lib/utils'

interface ProgressProps {
  statuses: Record<string, StepStatus | undefined>
  detail: string
  error: string
  running: boolean
  needsConfirm: boolean
  onRetry: () => void
  onConfirmReuse: () => void
  onEdit: () => void
}

const ICONS = {
  pending: Circle,
  running: Loader2,
  done: CheckCircle2,
  error: XCircle,
}

const STATUS_TEXT: Record<StepStatus, string> = {
  pending: 'Not started',
  running: 'In progress',
  done: 'Done',
  error: 'Failed',
}

export function Progress({
  statuses,
  detail,
  error,
  running,
  needsConfirm,
  onRetry,
  onConfirmReuse,
  onEdit,
}: ProgressProps) {
  const errorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Deploying</h2>
        <p className="text-muted-foreground text-sm">
          This takes about 5–10 minutes. Keep this tab open.
        </p>
      </div>
      <ol className="space-y-3">
        {STEPS.map((step) => {
          const status = statuses[step.id] ?? 'pending'
          const Icon = ICONS[status]
          return (
            <li key={step.id} className="flex gap-3">
              <Icon
                aria-hidden
                className={cn(
                  'mt-0.5 size-5 shrink-0',
                  status === 'running' && 'text-primary animate-spin',
                  status === 'done' && 'text-primary',
                  status === 'error' && 'text-destructive',
                  status === 'pending' && 'text-muted-foreground',
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    status === 'pending' && 'text-muted-foreground',
                    status === 'running' && 'font-medium',
                  )}
                >
                  {step.label}
                  <span className="sr-only"> ({STATUS_TEXT[status]})</span>
                </p>
                {status === 'running' && detail && (
                  <p className="text-muted-foreground text-sm break-words">
                    {detail}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* Announces the running step and its progress to screen readers */}
      <p role="status" className="sr-only">
        {running
          ? `${STEPS.find((s) => statuses[s.id] === 'running')?.label ?? ''}. ${detail}`
          : ''}
      </p>

      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="border-destructive/50 space-y-3 rounded-md border p-4 outline-none"
        >
          <p className="text-sm break-words">{error}</p>
          {!needsConfirm && (
            <p className="text-muted-foreground text-sm">
              Retry continues from this step. Finished steps are not repeated.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {needsConfirm ? (
              <Button type="button" onClick={onConfirmReuse}>
                Reuse this project
              </Button>
            ) : (
              <Button type="button" onClick={onRetry}>
                <RotateCcw aria-hidden /> Retry
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onEdit}>
              {needsConfirm ? 'Choose another name' : 'Edit details'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
