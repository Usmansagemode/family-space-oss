import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'

const MONTHS = [
  { value: 0, label: 'January', short: 'Jan' },
  { value: 1, label: 'February', short: 'Feb' },
  { value: 2, label: 'March', short: 'Mar' },
  { value: 3, label: 'April', short: 'Apr' },
  { value: 4, label: 'May', short: 'May' },
  { value: 5, label: 'June', short: 'Jun' },
  { value: 6, label: 'July', short: 'Jul' },
  { value: 7, label: 'August', short: 'Aug' },
  { value: 8, label: 'September', short: 'Sep' },
  { value: 9, label: 'October', short: 'Oct' },
  { value: 10, label: 'November', short: 'Nov' },
  { value: 11, label: 'December', short: 'Dec' },
]

interface MonthFilterProps {
  /** 0-indexed month numbers. Empty array = all months (no filter). */
  selectedMonths: number[]
  onSelectionChange: (selected: number[]) => void
}

function getTriggerLabel(selectedMonths: number[]): string {
  if (selectedMonths.length === 0 || selectedMonths.length === 12) return 'All months'
  if (selectedMonths.length <= 2) {
    return selectedMonths.map((v) => MONTHS[v]?.short ?? '').join(', ')
  }
  return `${selectedMonths.length} months`
}

export function MonthFilter({ selectedMonths, onSelectionChange }: MonthFilterProps) {
  const [open, setOpen] = useState(false)

  // "effective" selected set: empty means all are selected
  const effectiveSet = new Set(
    selectedMonths.length === 0 ? MONTHS.map((m) => m.value) : selectedMonths,
  )

  const hiddenCount = selectedMonths.length === 0 ? 0 : 12 - selectedMonths.length

  function toggle(value: number) {
    const next = new Set(effectiveSet)
    if (next.has(value)) {
      next.delete(value)
    } else {
      next.add(value)
    }
    const arr = [...next].sort((a, b) => a - b)
    // If all 12 selected, normalize to empty (= all)
    onSelectionChange(arr.length === 12 ? [] : arr)
  }

  function selectOnly(value: number) {
    onSelectionChange([value])
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5" />
          {getTriggerLabel(selectedMonths)}
          {hiddenCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
              {hiddenCount} hidden
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Filter by Month</span>
          <Button variant="ghost" size="xs" onClick={() => onSelectionChange([])}>
            All
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((month) => (
            <div
              key={month.value}
              className="flex items-center gap-1.5 rounded px-1.5 py-1 text-sm hover:bg-accent"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center">
                    <Checkbox
                      id={`month-${month.value}`}
                      checked={effectiveSet.has(month.value)}
                      onCheckedChange={() => toggle(month.value)}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {effectiveSet.has(month.value) ? `Remove ${month.label}` : `Add ${month.label}`}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => selectOnly(month.value)}
                    className="cursor-pointer text-left hover:text-primary hover:font-medium"
                  >
                    {month.short}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Show only {month.label}
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
