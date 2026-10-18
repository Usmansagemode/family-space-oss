import { useCSVImport } from '#/contexts/csvImport'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { NONE_VALUE, STANDARD_FIELDS } from '#/lib/csv-import'

const FIELD_LABELS: Record<string, string> = {
  date: 'Date',
  amount: 'Amount *',
  description: 'Description',
  categoryName: 'Category',
  locationName: 'Location',
  paidByName: 'Paid By',
}

export function StandardFormatMapping() {
  const {
    headers,
    mapping,
    defaultMonth,
    defaultYear,
    handleStandardFieldSelect,
    setDefaultMonth,
    setDefaultYear,
    handleMappingComplete,
    setStep,
    isStandardMapping,
  } = useCSVImport()

  if (!mapping || !isStandardMapping(mapping)) return <div>Invalid mapping type</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Map Columns</h2>
        <p className="text-muted-foreground text-sm">
          Map your CSV columns to expense fields. Amount is required.
        </p>
      </div>

      <div className="space-y-3">
        {STANDARD_FIELDS.map((field) => (
          <div key={field} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
            <span className="w-32 shrink-0 text-sm font-medium">
              {FIELD_LABELS[field] ?? field}
            </span>
            <Select
              onValueChange={(val) => handleStandardFieldSelect(field, val)}
              value={mapping[field as keyof typeof mapping] ?? NONE_VALUE}
            >
              <SelectTrigger className="w-full sm:w-56">
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

      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="mb-1 text-sm font-semibold">Default Date</h3>
        <p className="text-muted-foreground mb-3 text-xs">
          {mapping.date
            ? 'Used when date column is empty or invalid.'
            : 'No date column mapped — used for all expenses.'}
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="default-month" className="mb-1.5 text-xs">Month</Label>
            <Select value={defaultMonth} onValueChange={setDefaultMonth}>
              <SelectTrigger id="default-month">
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
            <Label htmlFor="default-year" className="mb-1.5 text-xs">Year</Label>
            <Select value={defaultYear} onValueChange={setDefaultYear}>
              <SelectTrigger id="default-year">
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
        <Button onClick={handleMappingComplete} disabled={!mapping.amount}>
          Continue to Preview
        </Button>
      </div>
    </div>
  )
}
