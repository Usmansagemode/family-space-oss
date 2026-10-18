import { createContext, useContext, useEffect, useState } from 'react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { createExpense, fetchExpensesByDateRange, logActivity } from '@family/supabase'
import type { Category, ExpenseWithNames, Space } from '@family/types'
import {
  NONE_VALUE,
  autoMapStandardFields,
  autoMapWideFormat,
  isStandardMapping,
  isWideFormatMapping,
  levenshteinDistance,
} from '#/lib/csv-import'
import type { Mapping, StandardMapping, WideFormatMapping } from '#/lib/csv-import'

export type DocumentStyle = 'wide-format' | 'standard'
export type Step = 'upload' | 'map' | 'preview'

type RowData = Record<string, string | number>

export type ImportExpense = {
  id: string
  date: string // YYYY-MM-DD
  amount: number
  description: string
  categoryId: string | null
  categoryName: string | null
  locationId: string | null
  locationName: string | null
  paidById: string | null
  paidByName: string | null
}

interface CSVImportContextType {
  // State
  documentStyle: DocumentStyle | null
  step: Step
  headers: string[]
  rows: RowData[]
  mapping: Mapping | null
  defaultMonth: string
  defaultYear: string
  mappedData: ImportExpense[]
  existingExpenses: ExpenseWithNames[]
  familyId: string
  categories: Category[]
  locationSpaces: Space[]
  personSpaces: Space[]

  // Setters
  setDocumentStyle: (style: DocumentStyle | null) => void
  setStep: (step: Step) => void
  setMapping: (mapping: Mapping | null) => void
  setDefaultMonth: (month: string) => void
  setDefaultYear: (year: string) => void
  setMappedData: (data: ImportExpense[]) => void

  // Actions
  handleFile: (file: File) => void
  handleMappingComplete: () => void
  handleSave: () => Promise<void>
  isSaving: boolean

  // Helper methods
  handleStandardFieldSelect: (field: string, column: string) => void
  handleCategoryColumnToggle: (column: string, checked: boolean) => void
  handleCategoryMappingChange: (column: string, categoryId: string) => void

  // Type guards
  isStandardMapping: (mapping: Mapping | null) => mapping is StandardMapping
  isWideFormatMapping: (mapping: Mapping | null) => mapping is WideFormatMapping
}

const CSVImportContext = createContext<CSVImportContextType | undefined>(undefined)

interface ProviderProps {
  children: React.ReactNode
  familyId: string
  categories: Category[]
  locationSpaces: Space[]
  personSpaces: Space[]
}

export function CSVImportProvider({
  children,
  familyId,
  categories,
  locationSpaces,
  personSpaces,
}: ProviderProps) {
  const now = new Date()

  const [documentStyle, setDocumentStyle] = useState<DocumentStyle | null>(null)
  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<RowData[]>([])
  const [mapping, setMapping] = useState<Mapping | null>(null)
  const [defaultMonth, setDefaultMonth] = useState<string>(
    String(now.getMonth() + 1).padStart(2, '0'),
  )
  const [defaultYear, setDefaultYear] = useState<string>(String(now.getFullYear()))
  const [mappedData, setMappedData] = useState<ImportExpense[]>([])
  const [existingExpenses, setExistingExpenses] = useState<ExpenseWithNames[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // When mappedData changes, fetch DB expenses in the same date range for duplicate detection
  useEffect(() => {
    if (mappedData.length === 0) {
      setExistingExpenses([])
      return
    }
    const dates = mappedData.map((e) => e.date).sort()
    const startDate = dates[0]!
    const endDate = dates[dates.length - 1]!
    void fetchExpensesByDateRange(familyId, startDate, endDate)
      .then(setExistingExpenses)
      .catch(() => {/* silent — duplicate detection is best-effort */})
  }, [mappedData, familyId])

  function resolveDate(dateStr: string): string {
    if (dateStr && dateStr.trim() !== '') {
      // Try parsing various date formats
      const trimmed = dateStr.trim()
      // Already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
      // Try MM/DD/YYYY
      const parts = trimmed.split(/[/-]/)
      if (parts.length === 3) {
        if (parts[0]!.length === 4) {
          // YYYY-MM-DD or YYYY/MM/DD
          return `${parts[0]}-${parts[1]!.padStart(2, '0')}-${parts[2]!.padStart(2, '0')}`
        } else {
          // MM/DD/YYYY
          return `${parts[2]}-${parts[0]!.padStart(2, '0')}-${parts[1]!.padStart(2, '0')}`
        }
      }
    }
    return `${defaultYear}-${defaultMonth}-01`
  }

  function findCategory(name: string): Category | null {
    if (!name.trim()) return null
    return (
      categories.find((c) => c.name.toLowerCase() === name.toLowerCase().trim()) ?? null
    )
  }

  function findLocation(name: string): Space | null {
    if (!name.trim()) return null
    return (
      locationSpaces.find((s) => s.name.toLowerCase() === name.toLowerCase().trim()) ?? null
    )
  }

  function findPaidBy(name: string): Space | null {
    if (!name.trim()) return null
    return (
      personSpaces.find((s) => s.name.toLowerCase() === name.toLowerCase().trim()) ?? null
    )
  }

  const handleFile = (file: File) => {
    if (!documentStyle) return

    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as RowData[]
        const filteredData = data.filter((row) =>
          Object.values(row).some((val) => val !== null && val !== undefined && val !== ''),
        )

        if (filteredData.length > 0) {
          const csvHeaders = Object.keys(filteredData[0]!).filter(
            (h) => h && h.trim() !== '' && !h.startsWith('_'),
          )
          const autoMapping =
            documentStyle === 'standard'
              ? autoMapStandardFields(csvHeaders)
              : autoMapWideFormat(csvHeaders)

          setHeaders(csvHeaders)
          setRows(filteredData)
          setMapping(autoMapping)
          setStep('map')
        }
      },
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true,
    })
  }

  const handleMappingComplete = () => {
    if (!mapping) return

    const baseTimestamp = Date.now()
    const transformed: ImportExpense[] = []

    if (isStandardMapping(mapping)) {
      if (!mapping.amount) {
        alert('Amount column is required')
        return
      }

      rows.forEach((row, i) => {
        const dateStr = mapping.date ? String(row[mapping.date] ?? '') : ''
        const amountStr = mapping.amount ? String(row[mapping.amount] ?? '0') : '0'
        const desc = mapping.description ? String(row[mapping.description] ?? '') : ''
        const catName = mapping.categoryName ? String(row[mapping.categoryName] ?? '') : ''
        const locName = mapping.locationName ? String(row[mapping.locationName] ?? '') : ''
        const paidByName = mapping.paidByName ? String(row[mapping.paidByName] ?? '') : ''

        const parsedAmount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0
        if (parsedAmount === 0) return

        const category = findCategory(catName)
        const location = findLocation(locName)
        const paidBy = findPaidBy(paidByName)

        transformed.push({
          id: `temp-${baseTimestamp}-${i}`,
          date: resolveDate(dateStr),
          amount: parsedAmount,
          description: desc,
          categoryId: category?.id ?? null,
          categoryName: category?.name ?? (catName || null),
          locationId: location?.id ?? null,
          locationName: location?.name ?? (locName || null),
          paidById: paidBy?.id ?? null,
          paidByName: paidBy?.name ?? (paidByName || null),
        })
      })
    } else if (isWideFormatMapping(mapping)) {
      if (!mapping.description) {
        alert('Description column is required')
        return
      }
      if (mapping.categoryColumns.length === 0) {
        alert('Please select at least one category column')
        return
      }

      rows.forEach((row, rowIndex) => {
        const dateStr = mapping.date ? String(row[mapping.date] ?? '') : ''
        const desc = mapping.description ? String(row[mapping.description] ?? '') : ''
        const locName = mapping.locationName ? String(row[mapping.locationName] ?? '') : ''
        const paidByName = mapping.paidByName ? String(row[mapping.paidByName] ?? '') : ''

        const location = findLocation(locName)
        const paidBy = findPaidBy(paidByName)

        mapping.categoryColumns.forEach((catColumn, catIndex) => {
          const cellValue = row[catColumn]
          if (!cellValue) return

          const parsedAmount = parseFloat(String(cellValue).replace(/[^0-9.-]/g, ''))
          if (isNaN(parsedAmount) || parsedAmount === 0) return

          const categoryId = mapping.categoryMapping[catColumn] ?? null
          const category = categoryId ? categories.find((c) => c.id === categoryId) ?? null : null

          transformed.push({
            id: `temp-${baseTimestamp}-${rowIndex}-${catIndex}`,
            date: resolveDate(dateStr),
            amount: parsedAmount,
            description: desc,
            categoryId: category?.id ?? null,
            categoryName: category?.name ?? catColumn,
            locationId: location?.id ?? null,
            locationName: location?.name ?? (locName || null),
            paidById: paidBy?.id ?? null,
            paidByName: paidBy?.name ?? (paidByName || null),
          })
        })
      })
    }

    setMappedData(transformed)
    setStep('preview')
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      for (const expense of mappedData) {
        await createExpense({
          familyId,
          amount: expense.amount,
          date: expense.date,
          description: expense.description || undefined,
          categoryId: expense.categoryId,
          categoryName: expense.categoryId ? expense.categoryName ?? undefined : undefined,
          locationId: expense.locationId,
          paidById: expense.paidById,
        })
      }
      void logActivity(familyId, 'expenses.imported', { count: mappedData.length })
      toast.success(`Successfully imported ${mappedData.length} expenses`)
      setMappedData([])
      setStep('upload')
      setDocumentStyle(null)
    } catch (error) {
      toast.error('Failed to import expenses')
      console.error('Import error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStandardFieldSelect = (field: string, column: string) => {
    setMapping((prev) => {
      if (!prev) return prev
      if (column === NONE_VALUE) {
        const next = { ...prev }
        delete (next as Record<string, unknown>)[field]
        return next
      }
      return { ...prev, [field]: column }
    })
  }

  const handleCategoryColumnToggle = (column: string, checked: boolean) => {
    if (!mapping || !isWideFormatMapping(mapping)) return

    const newColumns = checked
      ? [...mapping.categoryColumns, column]
      : mapping.categoryColumns.filter((c) => c !== column)

    const newCategoryMapping = { ...mapping.categoryMapping }
    if (checked && !newCategoryMapping[column]) {
      // Auto-map using Levenshtein against real categories
      let bestMatch: Category | null = categories[0] ?? null
      let bestScore = Infinity
      categories.forEach((cat) => {
        const score = levenshteinDistance(column.toLowerCase().trim(), cat.name.toLowerCase())
        if (score < bestScore) {
          bestScore = score
          bestMatch = cat
        }
      })
      if (bestMatch && bestScore <= 5) {
        newCategoryMapping[column] = bestMatch.id
      }
    } else if (!checked) {
      delete newCategoryMapping[column]
    }

    setMapping({ ...mapping, categoryColumns: newColumns, categoryMapping: newCategoryMapping })
  }

  const handleCategoryMappingChange = (column: string, categoryId: string) => {
    if (!mapping || !isWideFormatMapping(mapping)) return
    setMapping({ ...mapping, categoryMapping: { ...mapping.categoryMapping, [column]: categoryId } })
  }

  const value: CSVImportContextType = {
    documentStyle,
    step,
    headers,
    rows,
    mapping,
    defaultMonth,
    defaultYear,
    mappedData,
    existingExpenses,
    familyId,
    categories,
    locationSpaces,
    personSpaces,
    setDocumentStyle,
    setStep,
    setMapping,
    setDefaultMonth,
    setDefaultYear,
    setMappedData,
    handleFile,
    handleMappingComplete,
    handleSave,
    isSaving,
    handleStandardFieldSelect,
    handleCategoryColumnToggle,
    handleCategoryMappingChange,
    isStandardMapping,
    isWideFormatMapping,
  }

  return <CSVImportContext.Provider value={value}>{children}</CSVImportContext.Provider>
}

export function useCSVImport() {
  const ctx = useContext(CSVImportContext)
  if (!ctx) throw new Error('useCSVImport must be used within CSVImportProvider')
  return ctx
}
