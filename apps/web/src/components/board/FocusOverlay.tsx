import { useEffect } from 'react'
import { DndContext } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { User, ShoppingCart, X } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { Skeleton } from '#/components/ui/skeleton'
import { ItemCard } from './ItemCard'
import { useItems } from '#/hooks/items/useItems'
import type { Space } from '#/entities/Space'

type Props = {
  space: Space
  familyId: string
  onClose: () => void
}

export function FocusOverlay({ space, familyId, onClose }: Props) {
  const { data: items, isLoading } = useItems(space.id)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const today = new Date()
  const activeItems = (items ?? []).filter(
    (i) =>
      !i.completed ||
      (i.completedAt &&
        i.completedAt.getFullYear() === today.getFullYear() &&
        i.completedAt.getMonth() === today.getMonth() &&
        i.completedAt.getDate() === today.getDate()),
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-2.5 px-4 py-3"
        style={{ background: space.color, color: '#000' }}
      >
        {space.type === 'person' ? (
          <User className="h-4 w-4 shrink-0 opacity-60" />
        ) : (
          <ShoppingCart className="h-4 w-4 shrink-0 opacity-60" />
        )}
        <span className="flex-1 text-base font-bold">{space.name}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full opacity-60 transition hover:bg-black/10 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Exit focus mode</TooltipContent>
        </Tooltip>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-lg flex-col gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))
          ) : activeItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {space.type === 'person'
                  ? 'No tasks yet'
                  : 'Nothing on the list'}
              </p>
            </div>
          ) : (
            <DndContext sensors={[]}>
              <SortableContext
                items={activeItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {activeItems.map((item, index) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    spaceColor={space.color}
                    spaceName={space.name}
                    spaceType={space.type}
                    familyId={familyId}
                    index={index}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  )
}
