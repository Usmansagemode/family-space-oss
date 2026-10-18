import { useState } from 'react'
import { CalendarIcon, GripVertical, RefreshCw } from 'lucide-react'
import { confetti } from '#/components/ui/confetti'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  cn,
  formatDate,
  formatTime,
  hasExplicitTime,
  extractHue,
  getDateStatus,
} from '#/lib/utils'
import { useIsDark } from '#/hooks/useIsDark'
import { AddItemSheet } from './AddItemSheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { useItemMutations } from '#/hooks/items/useItemMutations'
import type { Item } from '#/entities/Item'
import type { SpaceType } from '#/entities/Space'

type Props = {
  item: Item
  spaceColor: string
  spaceName: string
  spaceType: SpaceType
  familyId: string
  index?: number
}

export function ItemCard({
  item,
  spaceColor,
  spaceName,
  spaceType,
  familyId,
  index = 0,
}: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const { complete, update, remove, reAdd, move } = useItemMutations(
    item.spaceId,
  )
  const hue = extractHue(spaceColor)
  const isDark = useIsDark()

  const dateStatus =
    spaceType === 'person' && item.startDate && !item.completed
      ? getDateStatus(item.startDate)
      : null

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
    transform,
    transition,
  } = useSortable({
    id: item.id,
    data: { type: 'item', item, spaceColor },
  })

  // Full card bg — pastel in light, deep tint in dark
  const cardBg = isDark ? `oklch(0.22 0.07 ${hue})` : spaceColor

  // Card border — slightly deeper than the bg for subtle definition
  const cardBorder =
    dateStatus === 'overdue'
      ? 'oklch(0.55 0.22 25)'
      : dateStatus === 'today'
        ? 'oklch(0.58 0.20 75)'
        : isDark
          ? `oklch(0.30 0.09 ${hue})`
          : `oklch(0.82 0.09 ${hue})`

  // Accent color for the checkmark tick (deeper/more vivid than card bg)
  const tickColor = isDark
    ? `oklch(0.80 0.10 ${hue})`
    : `oklch(0.55 0.18 ${hue})`

  function handleCheck(checked: boolean) {
    if (checked) {
      if (spaceType === 'person') {
        void confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: [spaceColor, '#ffffff', tickColor],
        })
      }
      complete.mutate(item)
    } else {
      reAdd.mutate(item)
    }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        className={cn(
          'rise-in group/card relative flex items-center gap-2.5 rounded-xl border px-3 py-3 shadow-sm transition-opacity',
          isDragging && 'opacity-40',
          item.completed && 'opacity-55',
        )}
        style={{
          background: cardBg,
          borderColor: cardBorder,
          transform: CSS.Transform.toString(transform),
          transition,
          animationDelay: `${Math.min(index * 40, 280)}ms`,
        }}
      >
        {/* Drag handle — hidden until hover */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="shrink-0 cursor-grab touch-none p-0 opacity-20 transition-opacity group-hover/card:opacity-50 hover:opacity-80! active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Drag to reorder</TooltipContent>
        </Tooltip>

        {/* Circular checkbox — white circle, colored tick when done */}
        <button
          type="button"
          role="checkbox"
          aria-checked={item.completed}
          onClick={(e) => {
            e.stopPropagation()
            handleCheck(!item.completed)
          }}
          disabled={complete.isPending || reAdd.isPending}
          className="flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-white transition-all duration-150 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {item.completed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke={tickColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Card body → opens edit sheet */}
        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer text-left"
          onClick={() => setEditOpen(true)}
        >
          <p
            className={cn(
              'line-clamp-2 text-sm font-semibold leading-snug',
              item.completed && 'line-through opacity-60',
            )}
          >
            {item.title}
            {item.quantity && (
              <span className="ml-1.5 text-xs font-normal opacity-50">
                × {item.quantity}
              </span>
            )}
          </p>
          {item.startDate && (
            <p className="mt-1 flex items-center gap-1.5 text-xs opacity-60">
              {item.recurrence ? (
                <RefreshCw className="h-3 w-3 shrink-0" />
              ) : (
                <CalendarIcon className="h-3 w-3 shrink-0" />
              )}
              <span>
                {formatDate(item.startDate)}
                {hasExplicitTime(item.startDate) &&
                  ` ${formatTime(item.startDate)}`}
                {item.endDate &&
                  ` – ${formatDate(item.endDate)}${hasExplicitTime(item.endDate) ? ` ${formatTime(item.endDate)}` : ''}`}
              </span>
              {dateStatus === 'overdue' && (
                <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-red-600 dark:text-red-400">
                  Overdue
                </span>
              )}
              {dateStatus === 'today' && (
                <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-600 dark:text-amber-400">
                  Today
                </span>
              )}
              {dateStatus === 'soon' && (
                <span className="rounded-full bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-yellow-600 dark:text-yellow-400">
                  Soon
                </span>
              )}
            </p>
          )}
          {item.description && (
            <p className="mt-1 line-clamp-1 text-xs opacity-60">
              {item.description}
            </p>
          )}
        </button>
      </div>

      <AddItemSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        spaceId={item.spaceId}
        spaceName={spaceName}
        spaceType={spaceType}
        spaceColor={spaceColor}
        familyId={familyId}
        editItem={item}
        onCreate={() => {}}
        onUpdate={(input) => {
          update.mutate(input, { onSuccess: () => setEditOpen(false) })
        }}
        onComplete={(it) =>
          complete.mutate(it, { onSuccess: () => setEditOpen(false) })
        }
        onDelete={(it) =>
          remove.mutate(it, { onSuccess: () => setEditOpen(false) })
        }
        onMove={(newSpaceId) => {
          move.mutate(
            { id: item.id, newSpaceId },
            { onSuccess: () => setEditOpen(false) },
          )
        }}
        isPending={
          update.isPending ||
          complete.isPending ||
          remove.isPending ||
          move.isPending
        }
      />
    </>
  )
}
