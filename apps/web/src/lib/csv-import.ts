// Field aliases for auto-mapping column headers
export const FIELD_ALIASES: Record<string, string[]> = {
  amount: ['amount', 'cost', 'price', 'total', 'value', 'debit'],
  categoryName: ['category', 'categoryname', 'type', 'expense type'],
  date: ['date', 'day', 'transaction date', 'expense date', 'posted date'],
  description: ['description', 'desc', 'details', 'note', 'memo', 'merchant', 'payee'],
  locationName: ['location', 'store', 'vendor', 'place', 'tag', 'tagname'],
  paidByName: ['member', 'membername', 'name', 'paid by', 'payer', 'person'],
}

export const STANDARD_FIELDS = [
  'date',
  'amount',
  'description',
  'categoryName',
  'locationName',
  'paidByName',
] as const

export const BASIC_FIELDS = ['date', 'description', 'paidByName', 'locationName'] as const

export const NONE_VALUE = '⸻none⸻'

export type StandardMapping = {
  date?: string
  amount?: string
  description?: string
  categoryName?: string
  locationName?: string
  paidByName?: string
}

export type WideFormatMapping = {
  date?: string
  description?: string
  locationName?: string
  paidByName?: string
  categoryColumns: string[]
  categoryMapping: Record<string, string>
}

export type Mapping = StandardMapping | WideFormatMapping

export function isWideFormatMapping(mapping: Mapping | null): mapping is WideFormatMapping {
  return mapping !== null && 'categoryColumns' in mapping
}

export function isStandardMapping(mapping: Mapping | null): mapping is StandardMapping {
  return mapping !== null && !('categoryColumns' in mapping)
}

// Levenshtein distance helper
export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null))

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1]!.toLowerCase() === b[j - 1]!.toLowerCase() ? 0 : 1
      matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost)
    }
  }

  return matrix[b.length][a.length]
}

function findBestHeaderMatch(field: string, csvHeaders: string[]): { header: string; score: number } {
  let bestMatch = ''
  let bestScore = Infinity
  const aliases = FIELD_ALIASES[field] ?? []

  csvHeaders.forEach((header) => {
    const headerLower = header.toLowerCase().trim()
    const aliasScore = Math.min(...aliases.map((alias) => levenshteinDistance(alias, headerLower)))
    if (aliasScore < bestScore) {
      bestScore = aliasScore
      bestMatch = header
    }
  })

  return { header: bestMatch, score: bestScore }
}

export function autoMapStandardFields(csvHeaders: string[]): StandardMapping {
  const map: StandardMapping = {}

  for (const field of STANDARD_FIELDS) {
    const { header, score } = findBestHeaderMatch(field, csvHeaders)
    if (score <= 2 && header) {
      map[field as keyof StandardMapping] = header
    }
  }

  return map
}

export function autoMapWideFormat(csvHeaders: string[]): WideFormatMapping {
  const map: WideFormatMapping = { categoryColumns: [], categoryMapping: {} }

  for (const field of BASIC_FIELDS) {
    const { header, score } = findBestHeaderMatch(field, csvHeaders)
    if (score <= 2 && header) {
      if (field === 'date') map.date = header
      else if (field === 'description') map.description = header
      else if (field === 'paidByName') map.paidByName = header
      else if (field === 'locationName') map.locationName = header
    }
  }

  const potentialCategoryColumns = csvHeaders.filter((header) => {
    const lower = header.toLowerCase()
    return (
      header !== map.date &&
      header !== map.description &&
      header !== map.paidByName &&
      header !== map.locationName &&
      header.trim() !== '' &&
      !lower.includes('total') &&
      !lower.includes('earning') &&
      !lower.includes('expense') &&
      !lower.startsWith('_')
    )
  })

  map.categoryColumns = potentialCategoryColumns
  return map
}

// Gemini config from localStorage
export const GEMINI_LS_KEY_API = 'family_gemini_api_key'
export const GEMINI_LS_KEY_MODEL = 'family_gemini_model'
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'
export const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (recommended)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
]

export function getGeminiApiKey(): string {
  return localStorage.getItem(GEMINI_LS_KEY_API) ?? ''
}

export function getGeminiModel(): string {
  return localStorage.getItem(GEMINI_LS_KEY_MODEL) ?? GEMINI_DEFAULT_MODEL
}

export function isGeminiConfigured(): boolean {
  return getGeminiApiKey().trim().length > 0
}
