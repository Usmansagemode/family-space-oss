import { useEffect, useState } from 'react'
import { AppCalendarLazy } from '#/components/calendar/AppCalendarLazy'
import { Button } from '#/components/ui/button'

const STORAGE_KEY = 'calendar-view'

type View = 'app' | 'google'

function readStoredView(): View {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'app' || v === 'google') return v
  } catch {
    // localStorage disabled / SSR — fall through to default
  }
  return 'app'
}

function isSafeEmbedUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname === 'calendar.google.com'
  } catch {
    return false
  }
}

type Props = {
  familyId: string
  embedUrl?: string
}

export function CalendarView({ familyId, embedUrl }: Props) {
  const safeEmbedUrl = embedUrl && isSafeEmbedUrl(embedUrl) ? embedUrl : undefined
  // Start with 'app' on the server; hydrate from localStorage once mounted on the client.
  // This avoids a hydration mismatch and a ReferenceError in SSR environments.
  const [view, setView] = useState<View>('app')

  useEffect(() => {
    setView(readStoredView())
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, view)
    } catch {
      // ignore quota / disabled
    }
  }, [view])

  return (
    <div className="flex h-full flex-col">
      {/* Toggle — only shown when a validated Google Calendar embed URL is configured */}
      {safeEmbedUrl && (
        <div className="flex shrink-0 items-center justify-end border-b border-border/40 px-4 py-2">
          <div
            role="group"
            aria-label="Calendar view"
            className="flex rounded-lg border border-border bg-muted p-0.5"
          >
            {(
              [
                { id: 'app', label: 'App Calendar' },
                { id: 'google', label: 'Google Calendar' },
              ] as const
            ).map(({ id, label }) => (
              <Button
                key={id}
                type="button"
                variant={view === id ? 'secondary' : 'ghost'}
                size="sm"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className={view === id ? 'shadow-sm' : 'text-muted-foreground'}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {view === 'google' && safeEmbedUrl ? (
          <iframe
            src={safeEmbedUrl}
            className="h-full w-full border-0"
            title="Google Calendar"
            referrerPolicy="no-referrer-when-downgrade"
            loading="lazy"
          />
        ) : (
          <AppCalendarLazy familyId={familyId} />
        )}
      </div>
    </div>
  )
}
