const API = 'https://www.googleapis.com/calendar/v3'
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

export type CalendarEventResult = {
  id: string
  htmlLink: string
}

// Noon (12:00:00) is the "date only, no explicit time" sentinel used throughout
// the app. Any other time means the user deliberately set a time.
function isAllDay(date: Date): boolean {
  return date.getHours() === 12 && date.getMinutes() === 0 && date.getSeconds() === 0
}

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Google Calendar all-day events use an exclusive end date (day after last day).
function nextDayStr(date: Date): string {
  return toDateStr(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1))
}

function buildEventTimes(startDate: Date, endDate?: Date) {
  if (isAllDay(startDate)) {
    return {
      start: { date: toDateStr(startDate) },
      end: { date: endDate ? nextDayStr(endDate) : nextDayStr(startDate) },
    }
  }
  const end = endDate ?? new Date(startDate.getTime() + 30 * 60 * 1000)
  return {
    start: { dateTime: startDate.toISOString(), timeZone: TZ },
    end: { dateTime: end.toISOString(), timeZone: TZ },
  }
}

export async function createCalendarEvent(
  token: string,
  calendarId: string,
  input: { title: string; startDate: Date; endDate?: Date },
): Promise<CalendarEventResult> {
  const res = await fetch(
    `${API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: input.title,
        ...buildEventTimes(input.startDate, input.endDate),
      }),
    },
  )

  if (!res.ok) throw new Error(`Calendar API ${res.status}`)
  const data = (await res.json()) as { id: string; htmlLink: string }
  return { id: data.id, htmlLink: data.htmlLink }
}

export async function updateCalendarEvent(
  token: string,
  calendarId: string,
  eventId: string,
  input: { title: string; startDate: Date; endDate?: Date },
): Promise<void> {
  const res = await fetch(
    `${API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: input.title,
        ...buildEventTimes(input.startDate, input.endDate),
      }),
    },
  )

  if (!res.ok) throw new Error(`Calendar API ${res.status}`)
}

export async function deleteCalendarEvent(
  token: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(
    `${API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  )

  // 404 / 410 = already gone, that's fine
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Calendar API ${res.status}`)
  }
}
