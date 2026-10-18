import { useIsDark } from '#/hooks/useIsDark'
import { extractHue } from '#/lib/utils'
import type { Item } from '#/entities/Item'

type Props = {
  item: Item
  spaceColor: string
}

export function ItemDragOverlay({ item, spaceColor }: Props) {
  const hue = extractHue(spaceColor)
  const isDark = useIsDark()
  const cardBg = isDark ? `oklch(0.22 0.07 ${hue})` : spaceColor
  const cardBorder = isDark
    ? `oklch(0.30 0.09 ${hue})`
    : `oklch(0.82 0.09 ${hue})`

  return (
    <div
      className="flex w-72 items-center gap-3 rounded-xl border px-3.5 py-3 shadow-xl rotate-1 cursor-grabbing"
      style={{ background: cardBg, borderColor: cardBorder }}
    >
      <div className="flex size-[18px] shrink-0 rounded-full bg-white" />
      <p className="text-sm font-medium leading-snug text-foreground">
        {item.title}
        {item.quantity && (
          <span className="ml-1.5 text-xs font-normal text-foreground/60">
            × {item.quantity}
          </span>
        )}
      </p>
    </div>
  )
}
