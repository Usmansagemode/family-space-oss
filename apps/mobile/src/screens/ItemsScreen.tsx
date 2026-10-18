import { useState } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { useItems, useItemMutationsCore } from '@family/hooks'
import type { Item, Space } from '@family/types'
import { ItemCard } from '../components/ItemCard'
import { AddItemModal } from '../components/AddItemModal'
import { EditItemModal } from '../components/EditItemModal'
import { SpaceIcon } from '../components/SpaceIcon'
import { getSpaceColors } from '../utils/spaceColor'

type Props = {
  space: Space
  onBack: () => void
}

export function ItemsScreen({ space, onBack }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const { data: items = [], isLoading, refetch } = useItems(space.id)
  const { complete, reAdd } = useItemMutationsCore(space.id, space.familyId, {
    calendarId: null,
    getToken: () => Promise.resolve(null),
  })

  const { base, accent, border } = getSpaceColors(space.color)
  const active = items.filter((i) => !i.completed)
  const done = items.filter((i) => i.completed)

  return (
    <View className="flex-1 bg-sand">
      {/* ── Header ── */}
      <View
        className="pt-14 pb-0 bg-foam border-b border-line"
        style={{
          shadowColor: '#1C1B2A',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Top row: back + title + add */}
        <View className="flex-row items-center px-4 pb-3 gap-3">
          <Pressable onPress={onBack} hitSlop={12}>
            <ChevronLeft size={26} color="#696680" />
          </Pressable>

          {/* Colored name chip */}
          <View
            className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full flex-1"
            style={{ backgroundColor: base }}
          >
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <Text
              className="text-sm font-bold flex-1 tracking-tight"
              style={{ color: accent }}
              numberOfLines={1}
            >
              {space.name}
            </Text>
          </View>

          {/* Add button */}
          <Pressable
            onPress={() => setShowAdd(true)}
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{
              backgroundColor: accent,
              shadowColor: accent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
            hitSlop={8}
          >
            <Text className="text-white text-xl font-light leading-none mt-0.5">
              +
            </Text>
          </Pressable>
        </View>

        {/* Colored accent bar at bottom of header */}
        <View className="h-0.5 mx-4 rounded-full mb-0" style={{ backgroundColor: border }} />
      </View>

      <FlatList
        data={active}
        keyExtractor={(i) => i.id}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={accent}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 8 }}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            spaceColorBase={base}
            spaceColorAccent={accent}
            spaceColorBorder={border}
            onComplete={() => complete.mutate(item)}
            onEdit={() => setEditItem(item)}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center mt-16 gap-3">
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center"
                style={{ backgroundColor: base }}
              >
                <SpaceIcon type={space.type} color={accent} size={20} />
              </View>
              <Text className="text-ink-muted text-base">
                {space.type === 'person'
                  ? 'No tasks yet — tap + to add one'
                  : 'Nothing on the list — tap + to add'}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          done.length > 0 ? (
            <View className="gap-2">
              <Text className="text-xs font-semibold uppercase tracking-widest text-ink-muted pt-4 pb-1">
                Completed
              </Text>
              {done.map((i) => (
                <ItemCard
                  key={i.id}
                  item={i}
                  spaceColorBase={base}
                  spaceColorAccent={accent}
                  spaceColorBorder={border}
                  onComplete={() => reAdd.mutate(i)}
                  onEdit={() => setEditItem(i)}
                />
              ))}
            </View>
          ) : null
        }
      />

      <AddItemModal
        spaceId={space.id}
        familyId={space.familyId}
        spaceColorAccent={accent}
        visible={showAdd}
        onClose={() => setShowAdd(false)}
      />

      <EditItemModal
        item={editItem}
        spaceId={space.id}
        familyId={space.familyId}
        spaceColorAccent={accent}
        visible={editItem !== null}
        onClose={() => setEditItem(null)}
      />
    </View>
  )
}
