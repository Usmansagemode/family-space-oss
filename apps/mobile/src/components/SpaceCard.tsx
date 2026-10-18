import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native'
import { Clock, Maximize2 } from 'lucide-react-native'
import { useItems, useItemMutationsCore } from '@family/hooks'
import type { Item, Space } from '@family/types'
import { getSpaceColors } from '../utils/spaceColor'
import { SpaceIcon } from './SpaceIcon'
import { ItemCard } from './ItemCard'
import { AddItemModal } from './AddItemModal'
import { EditItemModal } from './EditItemModal'

type Props = {
  space: Space
  onFocus: () => void
}

export function SpaceCard({ space, onFocus }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)

  const { data: items = [], isLoading } = useItems(space.id)
  const { complete, reAdd } = useItemMutationsCore(space.id, space.familyId, {
    calendarId: null,
    getToken: () => Promise.resolve(null),
  })

  const { base, accent, border } = getSpaceColors(space.color)
  const active = items.filter((i) => !i.completed)
  const completed = items.filter((i) => i.completed)

  return (
    <>
      <View
        className="rounded-2xl overflow-hidden bg-white"
        style={{
          shadowColor: '#1C1B2A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* ── Colored header ── */}
        <View
          className="flex-row items-center px-4 py-3 gap-2"
          style={{ backgroundColor: base }}
        >
          <SpaceIcon type={space.type} color={accent} size={14} />

          <Text
            className="flex-1 text-sm font-bold tracking-tight"
            style={{ color: accent }}
            numberOfLines={1}
          >
            {space.name}
          </Text>

          {/* Pending count */}
          {active.length > 0 && (
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: 'rgba(0,0,0,0.10)' }}
            >
              <Text className="text-[11px] font-bold" style={{ color: accent }}>
                {active.length}
              </Text>
            </View>
          )}

          {/* History toggle */}
          <Pressable
            onPress={() => setShowHistory((v) => !v)}
            hitSlop={8}
            className="w-7 h-7 rounded-md items-center justify-center"
            style={{
              backgroundColor: showHistory
                ? 'rgba(0,0,0,0.15)'
                : 'rgba(0,0,0,0.07)',
            }}
          >
            <Clock size={14} color={accent} />
            {completed.length > 0 && (
              <View
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.20)' }}
              >
                <Text style={{ fontSize: 8, fontWeight: '700', color: accent }}>
                  {completed.length}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Focus mode */}
          <Pressable
            onPress={onFocus}
            hitSlop={8}
            className="w-7 h-7 rounded-md items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
          >
            <Maximize2 size={14} color={accent} />
          </Pressable>
        </View>

        {/* ── Active items ── */}
        <View className="px-3 pt-2 pb-1 gap-2">
          {isLoading ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color={accent} />
            </View>
          ) : active.length === 0 ? (
            <View className="py-4 items-center gap-2">
              <View
                className="w-8 h-8 rounded-xl items-center justify-center"
                style={{ backgroundColor: base }}
              >
                <SpaceIcon type={space.type} color={accent} size={16} />
              </View>
              <Text className="text-xs text-ink-muted">
                {space.type === 'person' ? 'No tasks yet' : 'Nothing on the list'}
              </Text>
            </View>
          ) : (
            active.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                spaceColorBase={base}
                spaceColorAccent={accent}
                spaceColorBorder={border}
                onComplete={() => complete.mutate(item)}
                onEdit={() => setEditItem(item)}
              />
            ))
          )}
        </View>

        {/* ── History (completed items) ── */}
        {showHistory && completed.length > 0 && (
          <View className="px-3 pb-2 gap-2">
            <View className="flex-row items-center gap-2 pt-1 pb-1">
              <View className="flex-1 h-px" style={{ backgroundColor: border }} />
              <Text className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                Completed
              </Text>
              <View className="flex-1 h-px" style={{ backgroundColor: border }} />
            </View>
            {completed.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                spaceColorBase={base}
                spaceColorAccent={accent}
                spaceColorBorder={border}
                onComplete={() => reAdd.mutate(item)}
                onEdit={() => setEditItem(item)}
              />
            ))}
          </View>
        )}

        {/* ── Add item footer ── */}
        <View className="px-3 pb-3 pt-1">
          <Pressable
            onPress={() => setShowAdd(true)}
            className="flex-row items-center gap-1.5 rounded-xl px-3.5 py-2.5 active:opacity-60"
            style={{ borderWidth: 2, borderColor: border, borderStyle: 'dashed' }}
          >
            <Text className="text-xl font-light" style={{ color: border, marginTop: -2 }}>
              +
            </Text>
            <Text className="text-sm font-medium text-ink-muted">Add item</Text>
          </Pressable>
        </View>
      </View>

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
    </>
  )
}
