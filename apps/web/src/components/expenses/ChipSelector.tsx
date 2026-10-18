import { cn } from '#/lib/utils'

function chipColor(color: string): React.CSSProperties {
  return {
    background: `color-mix(in srgb, ${color} 15%, transparent)`,
    borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
    color: 'inherit',
  }
}

type Props<T extends { id: string }> = {
  items: T[]
  selected: string | null
  onSelect: (id: string | null) => void
  getColor: (item: T) => string
  renderChip: (item: T) => React.ReactNode
  /** Items where this returns true are shown only when selected (e.g. archived categories). */
  getDisabled?: (item: T) => boolean
  size?: 'sm' | 'md'
}

export function ChipSelector<T extends { id: string }>({
  items,
  selected,
  onSelect,
  getColor,
  renderChip,
  getDisabled,
  size = 'sm',
}: Props<T>) {
  if (items.length === 0) return null
  const sizeClass = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3 py-1.5 text-sm'

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const isSelected = selected === item.id
        const isDisabled = getDisabled?.(item) ?? false
        // Archived/disabled items are only shown when they are the current selection
        if (isDisabled && !isSelected) return null
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(isSelected ? null : item.id)}
            disabled={isDisabled}
            className={cn(
              'flex items-center gap-1.5 rounded-full border font-medium transition-all',
              sizeClass,
              isSelected
                ? 'shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground',
              isDisabled && 'cursor-default opacity-60',
            )}
            style={isSelected ? chipColor(getColor(item)) : undefined}
          >
            {renderChip(item)}
          </button>
        )
      })}
    </div>
  )
}
