import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { SpaceView } from '#/components/board/SpaceView'
import { CalendarView } from '#/components/CalendarView'
import { LoginPage } from '#/components/auth/LoginPage'
import { SearchDialog } from '#/components/SearchDialog'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import { useAuthContext } from '#/contexts/auth'
import { useUserFamily } from '#/hooks/auth/useUserFamily'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab === 'chores' || search.tab === 'calendar')
      ? (search.tab as 'chores' | 'calendar')
      : undefined,
  }),
  component: BoardPage,
})

function BoardPage() {
  return <AuthGate />
}

function AuthGate() {
  const { user, loading } = useAuthContext()

  if (loading) return <BoardSkeleton />
  if (!user) return <LoginPage />
  return <FamilyBoard userId={user.id} />
}

function FamilyBoard({ userId }: { userId: string }) {
  const { providerToken } = useAuthContext()
  const { data: family, isLoading } = useUserFamily(userId)

  if (isLoading) return <BoardSkeleton />
  if (!family) return null

  return (
    <FamilyContent
      familyId={family.id}
      providerToken={providerToken}
      calendarId={family.googleCalendarId ?? null}
      embedUrl={family.googleCalendarEmbedUrl}
    />
  )
}

function FamilyContent({
  familyId,
  providerToken,
  calendarId,
  embedUrl,
}: {
  familyId: string
  providerToken: string | null
  calendarId: string | null
  embedUrl?: string
}) {
  const { tab: rawTab } = Route.useSearch()
  const tab = rawTab ?? 'lists'
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {tab === 'lists' && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-end border-b border-border/40 px-4 py-2">
            <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)}>
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Search
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <SpaceView
              familyId={familyId}
              providerToken={providerToken}
              calendarId={calendarId}
              typeFilter="store"
            />
          </div>
        </div>
      )}
      {tab === 'chores' && (
        <div className="min-h-0 flex-1">
          <SpaceView
            familyId={familyId}
            providerToken={providerToken}
            calendarId={calendarId}
            typeFilter="person"
          />
        </div>
      )}
      <div className={cn('min-h-0 flex-1', tab !== 'calendar' && 'hidden')}>
        <CalendarView familyId={familyId} embedUrl={embedUrl} providerToken={providerToken} calendarId={calendarId} />
      </div>

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        familyId={familyId}
        providerToken={providerToken}
        calendarId={calendarId}
      />
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="flex h-full gap-4 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex h-full w-72 shrink-0 flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3"
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}
