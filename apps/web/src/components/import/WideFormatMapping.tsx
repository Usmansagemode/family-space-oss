import { useCSVImport } from '#/contexts/csvImport'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { BASIC_FIELDS, NONE_VALUE } from '#/lib/csv-import'
import type { WideFormatMapping } from '#/lib/csv-import'

const FIELD_LABELS: Record<string, string> = {
  date: 'Date',
  description: 'Description',
  paidByName: 'Paid By',
  locationName: 'Location',
}

export function WideFormatMapping() {
  const {
    headers,
    mapping,
    defaultMonth,
    defaultYear,
    categories,
    handleStandardFieldSelect,
    handleCategoryColumnToggle,
    handleCategoryMappingChange,
    setDefaultMonth,
    setDefaultYear,
    handleMappingComplete,
    setStep,
    isWideFormatMapping,
  } = useCSVImport()

  if (!mapping || !isWideFormatMapping(mapping)) return <div>Invalid mapping type</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Map Columns — Wide Format</h2>
        <p className="text-muted-foreground text-sm">
          Map basic fields and select which columns contain category amounts.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Basic fields */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Basic Fields</h3>
          {BASIC_FIELDS.map((field) => (
            <div key={field} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="w-28 shrink-0 text-sm font-medium">
                {FIELD_LABELS[field] ?? field}
              </span>
              <Select
                onValueChange={(val) => handleStandardFieldSelect(field, val)}
                value={(mapping[field as keyof WideFormatMapping] as string) ?? NONE_VALUE}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Category columns */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">
              Category Columns <span className="text-destructive">*</span>
            </h3>
            <p className="text-muted-foreground text-xs">Select columns with amounts and map to categories.</p>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {headers.map((header) => (
              <div key={header} className="flex items-center gap-3">
                <Checkbox
                  id={`cat-${header}`}
                  checked={mapping.categoryColumns.includes(header)}
                  onCheckedChange={(checked) =>
                    handleCategoryColumnToggle(header, checked as boolean)
                  }
                />
                <label htmlFor={`cat-${header}`} className="w-36 text-sm leading-none font-medium truncate">
                  {header}
                </label>
                {mapping.categoryColumns.includes(header) && (
                  <Select
                    value={mapping.categoryMapping[header] ?? NONE_VALUE}
                    onValueChange={(val) => handleCategoryMappingChange(header, val)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Keep as "{header}"</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Default date */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="mb-1 text-sm font-semibold">Default Date</h3>
        <p className="text-muted-foreground mb-3 text-xs">
          {mapping.date
            ? 'Used when date column is empty or invalid.'
            : 'No date column mapped — used for all expenses.'}
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="wide-default-month" className="mb-1.5 text-xs">Month</Label>
            <Select value={defaultMonth} onValueChange={setDefaultMonth}>
              <SelectTrigger id="wide-default-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const monthNum = String(i + 1).padStart(2, '0')
                  const monthName = new Date(2000, i).toLocaleString('default', { month: 'long' })
                  return (
                    <SelectItem key={monthNum} value={monthNum}>
                      {monthName}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="wide-default-year" className="mb-1.5 text-xs">Year</Label>
            <Select value={defaultYear} onValueChange={setDefaultYear}>
              <SelectTrigger id="wide-default-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 26 }, (_, i) => {
                  const year = String(2000 + i)
                  return (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">Uses 1st of month. Edit dates after import if needed.</p>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep('upload')}>
          Back
        </Button>
        <Button
          onClick={handleMappingComplete}
          disabled={!mapping.description || mapping.categoryColumns.length === 0}
        >
          Continue to Preview
        </Button>
      </div>
    </div>
  )
}
