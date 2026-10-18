import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native'
import { useQueries } from '@tanstack/react-query'
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns'
import { CalendarDays, ExternalLink } from 'lucide-react-native'
import { fetchItems } from '@family/supabase'
import { useSpaces, useUserFamily } from '@family/hooks'
import type { Item, Space } from '@family/types'
import { useAuthContext } from '../contexts/auth'
import { getSpaceColors } from '../utils/spaceColor'
import { EditItemModal } from '../components/EditItemModal'

type DatedItem = { item: Item; space: Space }
type FlatRow =
  | { kind: 'date-header'; label: string; isOverdue: boolean }
  | { kind: 'item'; item: Item; space: Space }

/**
 * Opens Google Calendar app if installed, otherwise falls back to browser.
 * - Android: Intent URL targets com.google.android.calendar with browser fallback
 * - iOS: https://calendar.google.com triggers Universal Links → Google Calendar app
 *        if installed; Safari otherwise. No custom scheme needed.
 */
async function openGoogleCalendar(fallbackUrl: string) {
  if (Platform.OS === 'android') {
    const intentUrl = [
      'intent://calendar.google.com/#Intent',
      'scheme=https',
      'package=com.google.android.calendar',
      `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`,
      'end',
    ].join(';')
    await Linking.openURL(intentUrl)
  } else {
    // Universal Links route to Google Calendar app on iOS if installed
    await Linking.openURL('https://calendar.google.com')
  }
}

function formatDayLabel(date: Date): { label: string; isOverdue: boolean } {
  if (isToday(date)) return { label: 'Today', isOverdue: false }
  if (isTomorrow(date)) return { label: 'Tomorrow', isOverdue: false }
  if (isPast(startOfDay(date))) return { label: format(date, 'EEE, MMM d'), isOverdue: true }
  return { label: format(date, 'EEE, MMM d'), isOverdue: false }
}

export function CalendarScreen() {
  const { user } = useAuthContext()
  const { data: family } = useUserFamily(user?.id)
  const { data: spaces = [], isLoading: spacesLoading } = useSpaces(family?.id ?? '')
  const [editItem, setEditItem] = useState<DatedItem | null>(null)

  // Fetch items for all spaces in parallel
  const itemQueries = useQueries({
    queries: spaces.map((space) => ({
      queryKey: ['items', space.id],
      queryFn: () => fetchItems(space.id),
      staleTime: 1000 * 60 * 2,
    })),
  })

  const isLoading = spacesLoading || itemQueries.some((q) => q.isLoading)

  // Flatten → filter dated active items → sort chronologically
  const datedItems: DatedItem[] = spaces
    .flatMap((space, i) => {
      const items = itemQueries[i]?.data ?? []
      return items
        .filter((item) => item.startDate && !item.completed)
        .map((item) => ({ item, space }))
    })
    .sort(
      (a, b) =>
        new Date(a.item.startDate!).getTime() -
        new Date(b.item.startDate!).getTime(),
    )

  // Build flat list with date-header rows
  const flat: FlatRow[] = []
  let lastDay = ''
  for (const { item, space } of datedItems) {
    const day = format(new Date(item.startDate!), 'yyyy-MM-dd')
    if (day !== lastDay) {
      const { label, isOverdue } = formatDayLabel(new Date(item.startDate!))
      flat.push({ kind: 'date-header', label, isOverdue })
      lastDay = day
    }
    flat.push({ kind: 'item', item, space })
  }

  // Google Calendar URL — open in system browser where user is already signed in
  const gcalUrl = family?.googleCalendarEmbedUrl ?? 'https://calendar.google.com'

  return (
    <View className="flex-1 bg-sand">
      {/* ── Header ── */}
      <View
        className="pt-14 px-4 pb-3 bg-foam border-b border-line"
        style={{
          shadowColor: '#1C1B2A',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-ink tracking-tight">
              Calendar
            </Text>
            <Text className="text-xs text-ink-muted mt-0.5">
              Items with scheduled dates
            </Text>
          </View>

          {/* Open Google Calendar in system browser */}
          <Pressable
            onPress={() => openGoogleCalendar(gcalUrl)}
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl active:opacity-70"
            style={{ backgroundColor: '#BEDAF2' }}
          >
            <CalendarDays size={14} color="#3A7DB5" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#3A7DB5' }}>
              Google Cal
            </Text>
            <ExternalLink size={11} color="#3A7DB5" />
          </Pressable>
        </View>
      </View>

      {/* ── Agenda ── */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4A8DB8" />
        </View>
      ) : flat.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <CalendarDays size={48} color="#E5E3DE" />
          <Text className="text-ink-muted text-base font-medium">
            No upcoming events
          </Text>
          <Text className="text-ink-muted text-sm text-center">
            Add a date to any item on the board to see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={flat}
          keyExtractor={(row, i) =>
            row.kind === 'date-header' ? `d-${row.label}-${i}` : row.item.id
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 40,
          }}
          renderItem={({ item: row }) => {
            if (row.kind === 'date-header') {
              return (
                <View className="flex-row items-center gap-2 mt-4 mb-2">
                  <Text
                    className="text-sm font-bold"
                    style={{ color: row.isOverdue ? '#C03030' : '#4A8DB8' }}
                  >
                    {row.label}
                  </Text>
                  {row.isOverdue && (
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{ backgroundColor: 'rgba(192,48,48,0.12)' }}
                    >
                      <Text
                        style={{ fontSize: 10, fontWeight: '600', color: '#C03030' }}
                      >
                        Overdue
                      </Text>
                    </View>
                  )}
                  <View
                    className="flex-1 h-px"
                    style={{ backgroundColor: '#E5E3DE' }}
                  />
                </View>
              )
            }

            const { base, accent, border } = getSpaceColors(row.space.color)
            return (
              <Pressable
                onPress={() => setEditItem({ item: row.item, space: row.space })}
                className="flex-row items-center gap-3 mb-2 px-3.5 py-3 rounded-xl active:opacity-70"
                style={{
                  backgroundColor: base,
                  borderWidth: 1,
                  borderColor: border,
                  shadowColor: '#1C1B2A',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                <View
                  className="w-1 self-stretch rounded-full"
                  style={{ backgroundColor: accent }}
                />
                <View className="flex-1 gap-0.5">
                  <Text
                    className="text-sm font-semibold text-ink"
                    numberOfLines={1}
                  >
                    {row.item.title}
                    {row.item.quantity ? (
                      <Text
                        style={{ fontWeight: '400', color: accent, opacity: 0.6 }}
                      >
                        {' '}× {row.item.quantity}
                      </Text>
                    ) : null}
                  </Text>
                  <Text className="text-xs text-ink-muted">
                    {row.space.name}
                  </Text>
                </View>
                {row.item.startDate &&
                  new Date(row.item.startDate).getHours() !== 12 && (
                    <Text
                      className="text-xs font-medium"
                      style={{ color: accent }}
                    >
                      {format(new Date(row.item.startDate), 'h:mm a')}
                    </Text>
                  )}
              </Pressable>
            )
          }}
        />
      )}

      {editItem && (
        <EditItemModal
          item={editItem.item}
          spaceId={editItem.space.id}
          spaceColorAccent={getSpaceColors(editItem.space.color).accent}
          visible={editItem !== null}
          onClose={() => setEditItem(null)}
        />
      )}
    </View>
  )
}
