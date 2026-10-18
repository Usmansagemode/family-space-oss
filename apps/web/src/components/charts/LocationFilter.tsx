import { MapPinIcon } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'

interface LocationFilterProps {
  locations: string[]
  /** Empty = no filter (show all). */
  selectedLocations: string[]
  onSelectionChange: (selected: string[]) => void
}

export function LocationFilter({
  locations,
  selectedLocations,
  onSelectionChange,
}: LocationFilterProps) {
  const selectedSet = new Set(selectedLocations)
  const activeCount = selectedLocations.length

  function toggle(loc: string) {
    const next = new Set(selectedSet)
    if (next.has(loc)) {
      next.delete(loc)
    } else {
      next.add(loc)
    }
    onSelectionChange([...next])
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <MapPinIcon className="h-3.5 w-3.5" />
          Location
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
              {activeCount} selected
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Location</span>
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => onSelectionChange([])}
          >
            Clear
          </Button>
        </div>
        <div className="max-h-52 overflow-y-auto space-y-0.5">
          {locations.map((loc) => (
            <label
              key={loc}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selectedSet.has(loc)}
                onCheckedChange={() => toggle(loc)}
              />
              <span className="truncate">{loc}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
