import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type ColorScheme = 'default' | 'blue' | 'green' | 'amber' | 'red' | 'violet'

type Props = {
  label: string
  value: number | string
  delta?: number | null
  deltaLabel?: string
  icon?: React.ElementType
  colorScheme?: ColorScheme
  className?: string
}

const COLOR_SCHEMES: Record<ColorScheme, { icon: string; border: string }> = {
  default: {
    icon: 'bg-muted text-muted-foreground',
    border: '',
  },
  blue: {
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    border: 'border-t-2 border-t-blue-400 dark:border-t-blue-500',
  },
  green: {
    icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    border: 'border-t-2 border-t-emerald-400 dark:border-t-emerald-500',
  },
  amber: {
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    border: 'border-t-2 border-t-amber-400 dark:border-t-amber-500',
  },
  red: {
    icon: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    border: 'border-t-2 border-t-red-400 dark:border-t-red-500',
  },
  violet: {
    icon: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    border: 'border-t-2 border-t-violet-400 dark:border-t-violet-500',
  },
}

export function StatCard({ label, value, delta, deltaLabel, icon: Icon, colorScheme = 'default', className }: Props) {
  const positive = delta !== undefined && delta !== null && delta >= 0
  const scheme = COLOR_SCHEMES[colorScheme]

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-5',
        scheme.border,
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <div className={cn('rounded-lg p-2', scheme.icon)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-bold tabular-nums">{value}</span>
        {delta !== undefined && delta !== null && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
            )}
          >
            {positive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {deltaLabel ?? `${Math.abs(delta)}`}
          </div>
        )}
      </div>
    </div>
  )
}
