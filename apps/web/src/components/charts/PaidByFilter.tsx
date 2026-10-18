import { UserIcon } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'

interface PaidByFilterProps {
  members: string[]
  /** Empty = no filter (show all). */
  selectedMembers: string[]
  onSelectionChange: (selected: string[]) => void
}

export function PaidByFilter({
  members,
  selectedMembers,
  onSelectionChange,
}: PaidByFilterProps) {
  const selectedSet = new Set(selectedMembers)
  const activeCount = selectedMembers.length

  function toggle(member: string) {
    const next = new Set(selectedSet)
    if (next.has(member)) {
      next.delete(member)
    } else {
      next.add(member)
    }
    onSelectionChange([...next])
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <UserIcon className="h-3.5 w-3.5" />
          Paid By
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
              {activeCount} selected
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Paid By</span>
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
          {members.map((member) => (
            <label
              key={member}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selectedSet.has(member)}
                onCheckedChange={() => toggle(member)}
              />
              <span className="truncate">{member}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
