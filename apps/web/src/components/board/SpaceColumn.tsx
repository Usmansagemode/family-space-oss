import { useState } from 'react'
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  User,
  ShoppingCart,
  MoreHorizontal,
  Plus,
  History,
  GripVertical,
  Maximize2,
  UserCheck,
  UserX,
  ShoppingBag,
} from 'lucide-react'
import { cn, extractHue } from '#/lib/utils'
import { useIsDark } from '#/hooks/useIsDark'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Skeleton } from '#/components/ui/skeleton'
import { NumberTicker } from '#/components/ui/number-ticker'
import { BorderBeam } from '#/components/ui/border-beam'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { ItemCard } from './ItemCard'
import { AddItemSheet } from './AddItemSheet'
import { HistorySheet } from './HistorySheet'
import { AddSpaceSheet } from './AddSpaceSheet'
import { useItems } from '#/hooks/items/useItems'
import { useItemMutations } from '#/hooks/items/useItemMutations'
import { useSpaceMutations } from '#/hooks/spaces/useSpaceMutations'
import type { Space } from '#/entities/Space'

type Props = {
  space: Space
  familyId: string
  allSpaces: Space[]
  isDropTarget?: boolean
  onFocus?: () => void
  onShop?: (storeId: string) => void
}

export function SpaceColumn({ space, familyId, allSpaces, isDropTarget, onFocus, onShop }: Props) {
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editSpaceOpen, setEditSpaceOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const { data: items, isLoading } = useItems(space.id)
  const { create: createItem } = useItemMutations(space.id, familyId)
  const { update: updateSpace, assign: assignSpace, remove: removeSpace } =
    useSpaceMutations(familyId)

  const personSpaces = allSpaces.filter((s) => s.type === 'person')
  const assignedPerson = space.type === 'store'
    ? allSpaces.find((s) => s.id === space.assignedPersonId) ?? null
    : null
  const assignedStores = space.type === 'person'
    ? allSpaces.filter((s) => s.type === 'store' && s.assignedPersonId === space.id)
    : []

  const hue = extractHue(space.color)
  const isDark = useIsDark()
  const accentColor = isDark
    ? `oklch(0.70 0.10 ${hue})`
    : `oklch(0.68 0.14 ${hue})`

  const today = new Date()
  const activeItems = (items ?? []).filter(
    (i) =>
      !i.completed ||
      (i.completedAt &&
        i.completedAt.getFullYear() === today.getFullYear() &&
        i.completedAt.getMonth() === today.getMonth() &&
        i.completedAt.getDate() === today.getDate()),
  )
  const pendingCount = (items ?? []).filter((i) => !i.completed).length
  const completedCount = (items ?? []).filter((i) => i.completed).length

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: space.id, data: { type: 'space' } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style,
          ...(isDropTarget && {
            boxShadow: `0 0 0 2px ${accentColor}`,
          }),
        }}
        className={cn(
          'group/column flex w-full flex-col overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border transition-shadow dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)] max-sm:overflow-visible sm:h-full sm:w-72 sm:shrink-0',
          isDropTarget && 'bg-card/80',
        )}
      >
        {isDropTarget && (
          <BorderBeam
            size={120}
            duration={2}
            colorFrom={accentColor}
            colorTo="transparent"
          />
        )}

        {/* Colored header — always dark text since pastel bg is light in both modes */}
        <div
          className="rounded-t-xl"
          style={{ background: space.color, color: '#000' }}
        >
          <div className="flex items-center gap-1.5 px-3 py-2.5">
            {/* Drag handle — hidden until hover */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="cursor-grab touch-none opacity-20 transition-opacity group-hover/column:opacity-50 hover:opacity-80! active:cursor-grabbing"
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Drag to reorder</TooltipContent>
            </Tooltip>

            {/* Space icon */}
            {space.type === 'person' ? (
              <User className="h-3.5 w-3.5 shrink-0 opacity-60" />
            ) : (
              <ShoppingCart className="h-3.5 w-3.5 shrink-0 opacity-60" />
            )}

            {/* Name */}
            <span className="min-w-0 flex-1 truncate text-sm font-bold">
              {space.name}
            </span>

            {/* Assigned person chip — store columns only */}
            {assignedPerson && (
              <span
                className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  background: isDark
                    ? `oklch(0.28 0.07 ${extractHue(assignedPerson.color)})`
                    : assignedPerson.color,
                  opacity: 0.9,
                }}
              >
                <User className="h-2.5 w-2.5" />
                {assignedPerson.name}
              </span>
            )}

            {/* Pending count badge */}
            {!isLoading && pendingCount > 0 && (
              <span className="shrink-0 rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                <NumberTicker value={pendingCount} />
              </span>
            )}

            {/* History — compact icon button with optional count */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-50 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
                >
                  <History className="h-3.5 w-3.5" />
                  {completedCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-black/20 px-1 text-[9px] font-bold leading-none dark:bg-white/20">
                      {completedCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>History</TooltipContent>
            </Tooltip>

            {/* Dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 cursor-pointer opacity-60 hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>More options</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                {onFocus && (
                  <DropdownMenuItem onClick={onFocus}>
                    <Maximize2 className="size-3.5" />
                    Focus mode
                  </DropdownMenuItem>
                )}
                {/* Assign to person — store columns only */}
                {space.type === 'store' && personSpaces.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <UserCheck className="size-3.5" />
                      Assign to person
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {personSpaces.map((person) => (
                        <DropdownMenuItem
                          key={person.id}
                          onClick={() =>
                            assignSpace.mutate({
                              id: space.id,
                              assignedPersonId:
                                space.assignedPersonId === person.id
                                  ? null
                                  : person.id,
                            })
                          }
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: person.color }}
                          />
                          {person.name}
                          {space.assignedPersonId === person.id && (
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              assigned
                            </span>
                          )}
                        </DropdownMenuItem>
                      ))}
                      {space.assignedPersonId && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              assignSpace.mutate({
                                id: space.id,
                                assignedPersonId: null,
                              })
                            }
                          >
                            <UserX className="size-3.5" />
                            Remove assignment
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                <DropdownMenuItem onClick={() => setEditSpaceOpen(true)}>
                  Edit space
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Delete space
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Items list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 max-sm:flex-none max-sm:overflow-visible">
          <div className="flex flex-col gap-2 pt-3 pb-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))
            ) : activeItems.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: space.color }}
                >
                  {space.type === 'person' ? (
                    <User className="h-4 w-4" style={{ color: accentColor }} />
                  ) : (
                    <ShoppingCart
                      className="h-4 w-4"
                      style={{ color: accentColor }}
                    />
                  )}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {space.type === 'person'
                      ? 'No tasks yet'
                      : 'Nothing on the list'}
                  </p>
                  <button
                    type="button"
                    className="cursor-pointer text-xs text-muted-foreground/60 transition hover:text-foreground"
                    onClick={() => setAddItemOpen(true)}
                  >
                    Add the first item →
                  </button>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {/* Assigned stores — person columns only */}
        {space.type === 'person' && assignedStores.length > 0 && (
          <div className="px-3 pb-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Your stores
            </p>
            <div className="flex flex-col gap-1.5">
              {assignedStores.map((store) => {
                const storeHue = extractHue(store.color)
                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => onShop?.(store.id)}
                    className="group/store flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/50"
                    style={{
                      borderColor: isDark
                        ? `oklch(0.32 0.06 ${storeHue})`
                        : `oklch(0.84 0.07 ${storeHue})`,
                      background: isDark
                        ? `oklch(0.20 0.04 ${storeHue})`
                        : `oklch(0.97 0.02 ${storeHue})`,
                    }}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                      style={{ background: store.color }}
                    >
                      <ShoppingCart className="h-3 w-3 text-white/80" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {store.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-muted-foreground transition-colors group-hover/store:text-foreground">
                      <ShoppingBag className="h-3 w-3" />
                      Shop
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Add item — dashed card */}
        <div className="p-3 pt-1">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-border px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
            onClick={() => setAddItemOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        </div>
      </div>

      {/* Sheets */}
      <AddItemSheet
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        spaceId={space.id}
        spaceName={space.name}
        spaceType={space.type}
        spaceColor={space.color}
        onCreate={(input) => {
          createItem.mutate(input)
        }}
        isPending={createItem.isPending}
      />

      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        spaceId={space.id}
        spaceName={space.name}
      />

      <AddSpaceSheet
        open={editSpaceOpen}
        onOpenChange={setEditSpaceOpen}
        editSpace={space}
        onUpdate={(input) =>
          updateSpace.mutate(input, {
            onSuccess: () => setEditSpaceOpen(false),
          })
        }
        isPending={updateSpace.isPending}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{space.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the space and all{' '}
              {(items ?? []).filter((i) => !i.completed).length > 0
                ? `${(items ?? []).filter((i) => !i.completed).length} remaining item(s) inside it`
                : 'items inside it'}
              . This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeSpace.mutate(space.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
