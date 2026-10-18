import { ChevronDown, Search } from 'lucide-react'

type FilterOption = { value: string; label: string }

type Props = {
  search: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string
  filters?: Array<{
    label: string
    value: string
    options: FilterOption[]
    onChange: (v: string) => void
  }>
}

export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 w-60 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
        />
      </div>
      {filters.map((f) => (
        <div key={f.label} className="relative">
          <select
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="h-9 cursor-pointer appearance-none rounded-lg border border-border bg-background pl-3 pr-8 text-sm font-medium outline-none transition-shadow focus:ring-2 focus:ring-ring"
          >
            {f.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      ))}
    </div>
  )
}
