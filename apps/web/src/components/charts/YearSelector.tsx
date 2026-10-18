import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

interface YearSelectorProps {
  value: number
  onValueChange: (year: number) => void
  range?: number
}

export function YearSelector({ value, onValueChange, range = 5 }: YearSelectorProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: range }, (_, i) => currentYear - i)

  return (
    <Select value={String(value)} onValueChange={(v) => onValueChange(Number(v))}>
      <SelectTrigger size="sm" className="w-[90px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
