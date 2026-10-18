import { format } from 'date-fns'

export function formatDate(date: Date): string {
  return format(date, 'MMM d')
}

export function formatDateFull(date: Date): string {
  return format(date, 'MMM d, yyyy')
}

// Noon (12:00) is the sentinel for "date picked, no explicit time set".
// Any other hour/minute means the user deliberately chose a time.
export function hasExplicitTime(date: Date): boolean {
  return !(date.getHours() === 12 && date.getMinutes() === 0)
}

export function formatTime(date: Date): string {
  return format(date, 'h:mm a') // e.g. "2:30 PM"
}
