import { useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { cn } from '#/lib/utils'
import { getCategoryIcon } from '#/lib/categoryIcons'
import type { Category, Space } from '@family/types'

type Field = 'category' | 'location' | 'paidBy' | 'description' | 'date' | 'amount'

type Patch = {
  categoryId?: string | null
  locationId?: string | null
  paidById?: string | null
  description?: string
  date?: string
  amount?: number
}

type Props = {
  selectedCount: number
  categories: Category[]
  locationSpaces: Space[]
  personSpaces: Space[]
  onApply: (patch: Patch) => void
  onDelete: () => void
  onClear: () => void
}

const FIELDS: { id: Field; label: string }[] = [
  { id: 'category', label: 'Category' },
  { id: 'location', label: 'Location' },
  { id: 'paidBy', label: 'Paid by' },
  { id: 'description', label: 'Description' },
  { id: 'date', label: 'Date' },
  { id: 'amount', label: 'Amount' },
]

function SpaceChips({
  items,
  selected,
  onSelect,
}: {
  items: Space[]
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => {
        const isSelected = selected === s.id
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(isSelected ? null : s.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
              isSelected
                ? 'border-transparent shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:text-foreground',
            )}
            style={isSelected ? { background: s.color + '33', color: 'inherit' } : undefined}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
            {s.name}
            {isSelected && <Check className="h-3 w-3 shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}

function CategoryChips({
  items,
  selected,
  onSelect,
}: {
  items: Category[]
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((cat) => {
        const isSelected = selected === cat.id
        const Icon = getCategoryIcon(cat.icon)
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(isSelected ? null : cat.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
              isSelected
                ? 'border-transparent shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:text-foreground',
            )}
            style={isSelected ? { background: (cat.color ?? '#888') + '33', color: 'inherit' } : undefined}
          >
            <span
              className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm"
              style={{ background: (cat.color ?? '#888') + '26' }}
            >
              <Icon className="h-2.5 w-2.5" style={{ color: cat.color ?? undefined }} />
            </span>
            {cat.name}
            {isSelected && <Check className="h-3 w-3 shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}

export function BulkEditBar({
  selectedCount,
  categories,
  locationSpaces,
  personSpaces,
  onApply,
  onDelete,
  onClear,
}: Props) {
  const [field, setField] = useState<Field>('category')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [paidById, setPaidById] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')

  function handleApply() {
    const patch: Patch = {}
    if (field === 'category') patch.categoryId = categoryId
    else if (field === 'location') patch.locationId = locationId
    else if (field === 'paidBy') patch.paidById = paidById
    else if (field === 'description') patch.description = description
    else if (field === 'date' && date) patch.date = date
    else if (field === 'amount' && amount) patch.amount = parseFloat(amount)
    onApply(patch)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/20">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
          {selectedCount} selected
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* Field selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Update field
          </label>
          <Select value={field} onValueChange={(v) => setField(v as Field)}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELDS.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Value input — changes based on field */}
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            New value
          </label>

          {field === 'category' && (
            <CategoryChips items={categories} selected={categoryId} onSelect={setCategoryId} />
          )}
          {field === 'location' && (
            <SpaceChips items={locationSpaces} selected={locationId} onSelect={setLocationId} />
          )}
          {field === 'paidBy' && (
            <SpaceChips items={personSpaces} selected={paidById} onSelect={setPaidById} />
          )}
          {field === 'description' && (
            <Input
              className="h-8 text-xs"
              placeholder="New description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
          {field === 'date' && (
            <Input
              type="date"
              className="h-8 text-xs"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
          {field === 'amount' && (
            <Input
              type="number"
              step="0.01"
              min="0"
              className="h-8 w-32 text-xs"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}
        </div>

        <Button type="button" size="sm" className="h-8 text-xs" onClick={handleApply}>
          Apply to {selectedCount}
        </Button>
      </div>
    </div>
  )
}
