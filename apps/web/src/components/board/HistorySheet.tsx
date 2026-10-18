import { useState } from 'react'
import { RotateCcw, Trash2, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { ScrollArea } from '#/components/ui/scroll-area'
import { Skeleton } from '#/components/ui/skeleton'
import { formatDateFull } from '#/lib/utils'
import { useItems } from '#/hooks/items/useItems'
import { useItemMutations } from '#/hooks/items/useItemMutations'
import type { Item } from '#/entities/Item'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  spaceId: string
  spaceName: string
}

export function HistorySheet({
  open,
  onOpenChange,
  spaceId,
  spaceName,
}: Props) {
  const { data: items, isLoading } = useItems(spaceId)
  const { reAdd, remove } = useItemMutations(spaceId)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Sort newest first, then deduplicate by title (case-insensitive).
  // The DB should already have one row per item (reAddItem uncompletes rather
  // than inserts), but we deduplicate here as a safety net for old data.
  const seen = new Set<string>()
  const completed = (items ?? [])
    .filter((i) => i.completed)
    .sort(
      (a, b) =>
        (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
    )
    .filter((i) => {
      const key = i.title.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  function handleReAdd(item: Item) {
    reAdd.mutate(item)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex max-w-sm flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border p-6">
          <SheetTitle>{spaceName} — History</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="flex flex-col p-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))
            ) : completed.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No completed items yet
              </p>
            ) : (
              completed.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border-b border-border py-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-muted-foreground">
                      {item.title}
                    </p>
                    {item.completedAt && (
                      <p className="text-xs text-muted-foreground/70">
                        {formatDateFull(item.completedAt)}
                      </p>
                    )}
                  </div>

                  {confirmDeleteId === item.id ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        Delete?
                      </span>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          remove.mutate(item, {
                            onSettled: () => setConfirmDeleteId(null),
                          })
                        }}
                        disabled={remove.isPending}
                      >
                        Yes
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => handleReAdd(item)}
                        disabled={reAdd.isPending}
                      >
                        <RotateCcw className="mr-1.5 h-3 w-3" />
                        Re-add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground/50 hover:text-destructive"
                        onClick={() => setConfirmDeleteId(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
