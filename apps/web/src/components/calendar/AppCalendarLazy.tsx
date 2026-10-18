import { lazy, Suspense } from 'react'
import type { AppCalendarProps } from './AppCalendar'

const AppCalendar = lazy(() =>
  import('./AppCalendar').then((m) => ({ default: m.AppCalendar }))
)

function CalendarSkeleton() {
  return <div className="h-[600px] w-full animate-pulse rounded-lg bg-muted" />
}

export function AppCalendarLazy(props: AppCalendarProps) {
  if (typeof window === 'undefined') return <CalendarSkeleton />

  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <AppCalendar {...props} />
    </Suspense>
  )
}
