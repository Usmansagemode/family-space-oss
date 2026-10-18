import { FilterIcon } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'

interface CategoryFilterProps {
  categories: string[]
  selectedCategories: string[]
  onSelectionChange: (selected: string[]) => void
}

export function CategoryFilter({
  categories,
  selectedCategories,
  onSelectionChange,
}: CategoryFilterProps) {
  const selectedSet = new Set(selectedCategories)
  const filteredCount = categories.length - selectedCategories.length

  function toggle(cat: string) {
    const next = new Set(selectedSet)
    if (next.has(cat)) {
      next.delete(cat)
    } else {
      next.add(cat)
    }
    const arr = categories.filter((c) => next.has(c))
    // If all selected, pass full list (no filtering)
    onSelectionChange(arr.length === categories.length ? [...categories] : arr)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FilterIcon className="h-3.5 w-3.5" />
          Filter Categories
          {filteredCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
              {filteredCount} hidden
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Categories</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onSelectionChange([...categories])}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={() =>
                onSelectionChange(categories.length > 0 ? [categories[0]!] : [])
              }
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto space-y-0.5">
          {categories.map((cat) => (
            <label
              key={cat}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selectedSet.has(cat)}
                onCheckedChange={() => toggle(cat)}
              />
              <span className="truncate">{cat}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
