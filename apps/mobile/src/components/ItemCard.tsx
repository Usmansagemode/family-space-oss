import { Pressable, Text, View } from 'react-native'
import { Calendar, RefreshCw } from 'lucide-react-native'
import type { Item } from '@family/types'
import {
  formatDate,
  hasExplicitTime,
  formatTime,
  getDateStatus,
} from '@family/utils'

type Props = {
  item: Item
  spaceColorBase: string
  spaceColorAccent: string
  spaceColorBorder: string
  onComplete: () => void
  onEdit: () => void
}

export function ItemCard({
  item,
  spaceColorBase,
  spaceColorAccent,
  spaceColorBorder,
  onComplete,
  onEdit,
}: Props) {
  const status = item.startDate && !item.completed
    ? getDateStatus(item.startDate)
    : null

  const cardBorderColor =
    status === 'overdue'
      ? '#D04040'
      : status === 'today'
        ? '#C88A00'
        : spaceColorBorder

  return (
    <View
      className="flex-row items-center gap-3 rounded-xl px-3.5 py-3"
      style={{
        backgroundColor: item.completed ? spaceColorBase + '99' : spaceColorBase,
        borderWidth: 1,
        borderColor: cardBorderColor,
        opacity: item.completed ? 0.6 : 1,
        shadowColor: '#1C1B2A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
      }}
    >
      {/* Checkbox — only this triggers complete/uncomplete */}
      <Pressable
        onPress={onComplete}
        hitSlop={8}
        className="w-[18px] h-[18px] rounded-full bg-white items-center justify-center flex-shrink-0"
        style={{
          shadowColor: '#1C1B2A',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        }}
      >
        {item.completed && (
          <Text
            style={{
              color: spaceColorAccent,
              fontSize: 9,
              fontWeight: '700',
              lineHeight: 10,
            }}
          >
            ✓
          </Text>
        )}
      </Pressable>

      {/* Body — tapping opens edit */}
      <Pressable className="flex-1 gap-0.5 active:opacity-60" onPress={onEdit}>
        <Text
          className={`text-sm font-semibold leading-snug ${item.completed ? 'line-through' : ''}`}
          style={{ color: item.completed ? spaceColorAccent + '80' : '#1C1B2A' }}
          numberOfLines={2}
        >
          {item.title}
          {item.quantity ? (
            <Text className="font-normal" style={{ color: spaceColorAccent, opacity: 0.55 }}>
              {' '}× {item.quantity}
            </Text>
          ) : null}
        </Text>

        {item.startDate ? (
          <View className="flex-row items-center gap-1 mt-0.5 flex-wrap">
            {item.recurrence
              ? <RefreshCw size={10} color="#1C1B2A" opacity={0.5} />
              : <Calendar size={10} color="#1C1B2A" opacity={0.5} />
            }
            <Text className="text-xs opacity-60" style={{ color: '#1C1B2A' }}>
              {formatDate(item.startDate)}
              {hasExplicitTime(item.startDate) ? ` · ${formatTime(item.startDate)}` : ''}
            </Text>
            {status === 'overdue' ? (
              <View style={{ backgroundColor: 'rgba(208,64,64,0.15)', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#C03030' }}>Overdue</Text>
              </View>
            ) : status === 'today' ? (
              <View style={{ backgroundColor: 'rgba(200,138,0,0.15)', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#9A6800' }}>Today</Text>
              </View>
            ) : status === 'soon' ? (
              <View style={{ backgroundColor: 'rgba(74,141,184,0.15)', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#3A7DB5' }}>Soon</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {item.description ? (
          <Text className="text-xs opacity-50 mt-0.5" style={{ color: '#1C1B2A' }} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </Pressable>
    </View>
  )
}
