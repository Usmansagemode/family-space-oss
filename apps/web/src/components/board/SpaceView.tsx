import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { ShimmerButton } from '#/components/ui/shimmer-button'
import { SpaceColumn } from './SpaceColumn'
import { AddSpaceSheet } from './AddSpaceSheet'
import { FocusOverlay } from './FocusOverlay'
import { ItemDragOverlay } from './ItemDragOverlay'
import { useSpaces } from '#/hooks/spaces/useSpaces'
import { useSpaceMutations } from '#/hooks/spaces/useSpaceMutations'
import { moveItem, reorderItems } from '#/lib/supabase/items'
import { BoardProvider } from '#/contexts/board'
import type { Space } from '#/entities/Space'
import type { Item } from '#/entities/Item'

type Props = {
  familyId: string
  providerToken: string | null
  calendarId: string | null
  typeFilter: 'person' | 'store'
}

type ActiveDragItem = { item: Item; spaceColor: string }

export function SpaceView({ familyId, providerToken, calendarId, typeFilter }: Props) {
  const [addSpaceOpen, setAddSpaceOpen] = useState(false)
  const [focusedSpaceId, setFocusedSpaceId] = useState<string | null>(null)
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(
    null,
  )
  const [overSpaceId, setOverSpaceId] = useState<string | null>(null)

  const { data: spaces, isLoading } = useSpaces(familyId)
  const filteredSpaces = (spaces ?? []).filter((s) => s.type === typeFilter)
  const { create, reorder } = useSpaceMutations(familyId)
  const queryClient = useQueryClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const moveItemMutation = useMutation({
    mutationFn: ({ item, newSpaceId }: { item: Item; newSpaceId: string }) =>
      moveItem(item.id, newSpaceId),
    onError: (_err, { item, newSpaceId }) => {
      queryClient.setQueryData<Item[]>(
        ['items', newSpaceId],
        (old) => old?.filter((i) => i.id !== item.id) ?? [],
      )
      queryClient.setQueryData<Item[]>(['items', item.spaceId], (old) => [
        item,
        ...(old ?? []),
      ])
      toast.error('Failed to move item')
    },
    onSettled: (_data, _err, { item, newSpaceId }) => {
      void queryClient.invalidateQueries({ queryKey: ['items', item.spaceId] })
      void queryClient.invalidateQueries({ queryKey: ['items', newSpaceId] })
    },
  })

  const reorderItemsMutation = useMutation({
    mutationFn: ({
      spaceId,
      orderedIds,
    }: {
      spaceId: string
      orderedIds: string[]
    }) => reorderItems(spaceId, orderedIds),
    onError: (_err, { spaceId }) => {
      void queryClient.invalidateQueries({ queryKey: ['items', spaceId] })
      toast.error('Failed to reorder items')
    },
  })

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === 'item') {
      setActiveDragItem({
        item: event.active.data.current.item as Item,
        spaceColor: event.active.data.current.spaceColor as string,
      })
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (event.active.data.current?.type === 'item') {
      const overType = event.over?.data.current?.type
      if (overType === 'space') {
        setOverSpaceId(event.over!.id as string)
      } else if (overType === 'item') {
        setOverSpaceId(
          (event.over?.data.current?.item as Item | undefined)?.spaceId ?? null,
        )
      } else {
        setOverSpaceId(null)
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragItem(null)
    setOverSpaceId(null)

    const { active, over } = event
    if (!over) return

    const activeType = active.data.current?.type

    if (activeType === 'space') {
      if (active.id === over.id || !filteredSpaces.length) return
      const oldIndex = filteredSpaces.findIndex((s) => s.id === active.id)
      const newIndex = filteredSpaces.findIndex((s) => s.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(filteredSpaces, oldIndex, newIndex)
      // Merge reordered filtered spaces back into full spaces list preserving other types
      const otherSpaces = (spaces ?? []).filter((s) => s.type !== typeFilter)
      queryClient.setQueryData<Space[]>(['spaces', familyId], [
        ...reordered,
        ...otherSpaces,
      ])
      reorder.mutate([...reordered, ...otherSpaces].map((s) => s.id))
    } else if (activeType === 'item') {
      const draggedItem = active.data.current?.item as Item
      const overType = over.data.current?.type

      // Determine target space ID
      let targetSpaceId: string
      if (overType === 'space') {
        targetSpaceId = over.id as string
      } else if (overType === 'item') {
        targetSpaceId = (over.data.current?.item as Item).spaceId
      } else {
        return
      }

      const sourceSpace = filteredSpaces.find((s) => s.id === draggedItem.spaceId)
      const targetSpace = filteredSpaces.find((s) => s.id === targetSpaceId)
      if (!sourceSpace || !targetSpace) return

      if (draggedItem.spaceId === targetSpaceId && overType === 'item') {
        // Same column — reorder
        const overItem = over.data.current?.item as Item
        const allItems =
          queryClient.getQueryData<Item[]>(['items', draggedItem.spaceId]) ?? []
        const oldIdx = allItems.findIndex((i) => i.id === draggedItem.id)
        const newIdx = allItems.findIndex((i) => i.id === overItem.id)
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return
        const reordered = arrayMove(allItems, oldIdx, newIdx)
        queryClient.setQueryData<Item[]>(
          ['items', draggedItem.spaceId],
          reordered,
        )
        reorderItemsMutation.mutate({
          spaceId: draggedItem.spaceId,
          orderedIds: reordered.map((i) => i.id),
        })
      } else if (draggedItem.spaceId !== targetSpaceId) {
        // Cross-space move
        if (sourceSpace.type !== targetSpace.type) return
        queryClient.setQueryData<Item[]>(
          ['items', draggedItem.spaceId],
          (old) => old?.filter((i) => i.id !== draggedItem.id) ?? [],
        )
        queryClient.setQueryData<Item[]>(['items', targetSpaceId], (old) => [
          { ...draggedItem, spaceId: targetSpaceId },
          ...(old ?? []),
        ])
        moveItemMutation.mutate({
          item: draggedItem,
          newSpaceId: targetSpaceId,
        })
      }
    }
  }

  function handleDragCancel() {
    setActiveDragItem(null)
    setOverSpaceId(null)
  }

  return (
    <BoardProvider
      familyId={familyId}
      providerToken={providerToken}
      calendarId={calendarId}
    >
      <div className="flex h-full flex-col">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex h-full flex-col gap-4 overflow-y-auto bg-muted/30 p-4 pb-6 sm:flex-row sm:overflow-x-auto sm:overflow-y-hidden">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-48 w-full flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:h-full sm:w-72 sm:shrink-0"
                >
                  <Skeleton className="h-1 w-full rounded-t-xl" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </div>
              ))
            ) : (
              <SortableContext
                items={filteredSpaces.map((s) => s.id)}
                strategy={horizontalListSortingStrategy}
              >
                {filteredSpaces.map((space) => (
                  <SpaceColumn
                    key={space.id}
                    space={space}
                    familyId={familyId}
                    allSpaces={spaces ?? []}
                    isDropTarget={
                      activeDragItem !== null &&
                      overSpaceId === space.id &&
                      filteredSpaces.find(
                        (s) => s.id === activeDragItem.item.spaceId,
                      )?.type === space.type
                    }
                    onFocus={() => setFocusedSpaceId(space.id)}
                    onShop={(storeId) => setFocusedSpaceId(storeId)}
                  />
                ))}
              </SortableContext>
            )}

            {/* Add Space button */}
            {!isLoading && (
              <div className="flex shrink-0 items-start pt-1">
                {filteredSpaces.length === 0 ? (
                  <ShimmerButton
                    onClick={() => setAddSpaceOpen(true)}
                    background="oklch(0.4 0.13 258)"
                    className="gap-2 whitespace-nowrap px-5 py-2.5 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Add Space
                  </ShimmerButton>
                ) : (
                  <Button
                    variant="outline"
                    className="gap-2 whitespace-nowrap"
                    onClick={() => setAddSpaceOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Space
                  </Button>
                )}
              </div>
            )}
          </div>

          <DragOverlay>
            {activeDragItem ? (
              <ItemDragOverlay
                item={activeDragItem.item}
                spaceColor={activeDragItem.spaceColor}
              />
            ) : null}
          </DragOverlay>
        </DndContext>

        <AddSpaceSheet
          open={addSpaceOpen}
          onOpenChange={setAddSpaceOpen}
          defaultType={typeFilter}
          onCreate={(input) => {
            create.mutate(input, { onSuccess: () => setAddSpaceOpen(false) })
          }}
          isPending={create.isPending}
        />
      </div>

      {focusedSpaceId && (spaces ?? []).find((s) => s.id === focusedSpaceId) && (
        <FocusOverlay
          space={(spaces ?? []).find((s) => s.id === focusedSpaceId)!}
          familyId={familyId}
          onClose={() => setFocusedSpaceId(null)}
        />
      )}
    </BoardProvider>
  )
}
