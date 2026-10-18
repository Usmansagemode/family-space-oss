import { useState } from 'react'
import { useDebounce } from '@family/utils'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Search, X } from 'lucide-react-native'
import { useSearchItems } from '@family/hooks'
import { useUserFamily } from '@family/hooks'
import type { Item, Space } from '@family/types'
import { useAuthContext } from '../contexts/auth'
import { getSpaceColors } from '../utils/spaceColor'
import { EditItemModal } from '../components/EditItemModal'

export function SearchScreen() {
  const { user } = useAuthContext()
  const { data: family } = useUserFamily(user?.id)

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [editItem, setEditItem] = useState<{ item: Item; space: Space } | null>(null)

  const { data: results = [], isLoading } = useSearchItems(
    family?.id ?? '',
    debouncedQuery,
  )

  // Group by space
  const grouped: Array<{ space: Space; items: Item[] }> = []
  for (const r of results) {
    const existing = grouped.find((g) => g.space.id === r.space.id)
    if (existing) existing.items.push(r.item)
    else grouped.push({ space: r.space, items: [r.item] })
  }

  type FlatRow =
    | { kind: 'space-header'; space: Space }
    | { kind: 'item'; item: Item; space: Space }

  const flat: FlatRow[] = grouped.flatMap(({ space, items }) => [
    { kind: 'space-header', space },
    ...items.map((item) => ({ kind: 'item' as const, item, space })),
  ])

  return (
    <View className="flex-1 bg-sand">
      {/* ── Header ── */}
      <View
        className="pt-14 pb-3 px-4 bg-foam border-b border-line"
        style={{
          shadowColor: '#1C1B2A',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Text className="text-2xl font-bold text-ink tracking-tight mb-3">
          Search
        </Text>

        {/* Search input */}
        <View
          className="flex-row items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-line"
        >
          <Search size={16} color="#8A8799" />
          <TextInput
            className="flex-1 text-base text-ink"
            placeholder="Search across all spaces…"
            placeholderTextColor="#8A8799"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <X size={16} color="#8A8799" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Results ── */}
      {!debouncedQuery.trim() ? (
        <View className="flex-1 items-center justify-center">
          <Search size={40} color="#E5E3DE" />
          <Text className="text-ink-muted text-base mt-4">
            Start typing to search
          </Text>
          <Text className="text-ink-muted text-sm mt-1">
            Searches across all spaces
          </Text>
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4A8DB8" />
        </View>
      ) : flat.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-ink-muted text-base">
            No results for "{debouncedQuery}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={flat}
          keyExtractor={(row) =>
            row.kind === 'space-header' ? `h-${row.space.id}` : row.item.id
          }
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: row }) => {
            if (row.kind === 'space-header') {
              const { base, accent } = getSpaceColors(row.space.color)
              return (
                <View
                  className="flex-row items-center gap-2 px-4 py-2 mt-2"
                >
                  <View
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: base, borderWidth: 1.5, borderColor: accent }}
                  />
                  <Text className="text-xs font-semibold text-ink-soft uppercase tracking-widest">
                    {row.space.name}
                  </Text>
                </View>
              )
            }

            const { base, accent, border } = getSpaceColors(row.space.color)
            return (
              <Pressable
                onPress={() => setEditItem({ item: row.item, space: row.space })}
                className="flex-row items-center gap-3 mx-4 mb-2 px-3.5 py-3 rounded-xl active:opacity-70"
                style={{
                  backgroundColor: row.item.completed ? base + '88' : base,
                  borderWidth: 1,
                  borderColor: border,
                  opacity: row.item.completed ? 0.65 : 1,
                }}
              >
                <View
                  className="w-1.5 h-full rounded-full self-stretch"
                  style={{ backgroundColor: accent }}
                />
                <View className="flex-1">
                  <Text
                    className={`text-sm font-semibold text-ink ${row.item.completed ? 'line-through' : ''}`}
                    style={{ color: row.item.completed ? accent + '80' : '#1C1B2A' }}
                    numberOfLines={1}
                  >
                    {row.item.title}
                    {row.item.quantity ? (
                      <Text className="font-normal" style={{ color: accent, opacity: 0.6 }}>
                        {' '}× {row.item.quantity}
                      </Text>
                    ) : null}
                  </Text>
                  <Text className="text-xs text-ink-muted mt-0.5">
                    {row.space.name}
                  </Text>
                </View>
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
