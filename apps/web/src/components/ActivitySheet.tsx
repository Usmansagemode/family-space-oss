import { formatDistanceToNow } from 'date-fns'
import { CheckCheck, Plus, Receipt, Upload, Users } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '#/components/ui/sheet'
import { Skeleton } from '#/components/ui/skeleton'
import { AnimatedList } from '#/components/ui/animated-list'
import { useActivityFeed } from '#/hooks/family/useActivityFeed'
import type { ActivityEvent } from '#/hooks/family/useActivityFeed'
import type { ActivityEventType } from '@family/types'
import { formatCurrency } from '#/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string | undefined
}

type EventMeta = {
  icon: React.ReactNode
  iconBg: string
  text: (event: ActivityEvent) => React.ReactNode
}

function getEventMeta(event: ActivityEvent): EventMeta {
  const p = event.payload
  const actor = event.actorName

  const metas: Record<ActivityEventType, EventMeta> = {
    'item.added': {
      icon: <Plus className="h-3 w-3 opacity-70" />,
      iconBg: (p['space_color'] as string | undefined) ?? 'oklch(0.82 0.10 228)',
      text: () => (
        <>
          {actor && <span className="font-semibold">{actor} </span>}
          <span className="text-muted-foreground">added </span>
          <span className="font-medium">{p['title'] as string}</span>
          <span className="text-muted-foreground"> in {p['space_name'] as string}</span>
        </>
      ),
    },
    'item.completed': {
      icon: <CheckCheck className="h-3 w-3 opacity-70" />,
      iconBg: (p['space_color'] as string | undefined) ?? 'oklch(0.82 0.10 228)',
      text: () => (
        <>
          {actor && <span className="font-semibold">{actor} </span>}
          <span className="text-muted-foreground">completed </span>
          <span className="font-medium">{p['title'] as string}</span>
          <span className="text-muted-foreground"> in {p['space_name'] as string}</span>
        </>
      ),
    },
    'expense.added': {
      icon: <Receipt className="h-3 w-3 opacity-70" />,
      iconBg: 'oklch(0.82 0.10 152)',
      text: () => (
        <>
          {actor && <span className="font-semibold">{actor} </span>}
          <span className="text-muted-foreground">logged </span>
          {p['category'] && (
            <span className="text-muted-foreground">a {p['category'] as string} expense — </span>
          )}
          <span className="font-medium">{formatCurrency(p['amount'] as number)}</span>
        </>
      ),
    },
    'expenses.imported': {
      icon: <Upload className="h-3 w-3 opacity-70" />,
      iconBg: 'oklch(0.82 0.10 228)',
      text: () => (
        <>
          {actor && <span className="font-semibold">{actor} </span>}
          <span className="text-muted-foreground">imported </span>
          <span className="font-medium">{p['count'] as number} expenses</span>
        </>
      ),
    },
    'member.joined': {
      icon: <Users className="h-3 w-3 opacity-70" />,
      iconBg: 'oklch(0.82 0.10 308)',
      text: () => (
        <>
          <span className="font-semibold">{(p['name'] as string | undefined) ?? actor ?? 'Someone'}</span>
          <span className="text-muted-foreground"> joined the family</span>
        </>
      ),
    },
  }

  return metas[event.eventType]
}

export function ActivitySheet({ open, onOpenChange, familyId }: Props) {
  const { data: events, isLoading } = useActivityFeed(familyId, open)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex max-w-sm flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle>Recent Activity</SheetTitle>
          <SheetDescription className="sr-only">
            Family activity from the last 14 days
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-4 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : !events?.length ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No recent activity
              </p>
              <p className="text-xs text-muted-foreground/60">
                Actions by family members will appear here.
              </p>
            </div>
          ) : (
            <AnimatedList className="flex flex-col divide-y divide-border/40 gap-0">
              {events.map((event) => {
                const meta = getEventMeta(event)
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 px-6 py-3.5"
                  >
                    <div
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ background: meta.iconBg }}
                    >
                      {meta.icon}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="text-sm leading-snug">
                        {meta.text(event)}
                      </p>
                      <p className="text-xs text-muted-foreground/50">
                        {formatDistanceToNow(event.timestamp, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </AnimatedList>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
