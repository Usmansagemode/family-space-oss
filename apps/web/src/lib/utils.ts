import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export {
  formatDate,
  formatDateFull,
  hasExplicitTime,
  formatTime,
  extractHue,
  getDateStatus,
} from '@family/utils'
export type { DateStatus } from '@family/utils'

/**
 * Parse a YYYY-MM-DD date string in LOCAL time (not UTC).
 * NEVER use new Date("YYYY-MM-DD") — it parses as UTC and shifts back a day in US timezones.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

/**
 * Format a number as currency using the family's locale and currency code.
 * Falls back to USD/en-US if not provided.
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Compact currency format for chart axis ticks.
 * e.g. $1,234.56 → $1.2K, $1,234,567 → $1.2M
 */
export function formatCurrencyCompact(
  amount: number,
  currency = 'USD',
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

/** Returns an array of available years for the year picker (current year + 4 previous). */
export function getYearOptions(currentYear = new Date().getFullYear()): number[] {
  return Array.from({ length: 5 }, (_, i) => currentYear - i)
}
