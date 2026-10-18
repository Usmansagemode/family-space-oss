import { Pressable, View, Text } from 'react-native'
import { LayoutGrid, CalendarDays, Search, Receipt } from 'lucide-react-native'

export type Tab = 'board' | 'calendar' | 'expenses' | 'search'

type Props = {
  activeTab: Tab
  onChangeTab: (tab: Tab) => void
}

const TABS: { key: Tab; label: string; Icon: typeof LayoutGrid }[] = [
  { key: 'board', label: 'Board', Icon: LayoutGrid },
  { key: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { key: 'expenses', label: 'Expenses', Icon: Receipt },
  { key: 'search', label: 'Search', Icon: Search },
]

const ACTIVE_COLOR = '#4A8DB8'
const INACTIVE_COLOR = '#8A8799'

export function TabBar({ activeTab, onChangeTab }: Props) {
  return (
    <View
      className="flex-row bg-foam border-t border-line"
      style={{ paddingBottom: 24 }} // safe area for home indicator
    >
      {TABS.map(({ key, label, Icon }) => {
        const active = activeTab === key
        const color = active ? ACTIVE_COLOR : INACTIVE_COLOR
        return (
          <Pressable
            key={key}
            onPress={() => onChangeTab(key)}
            className="flex-1 items-center pt-3 pb-1 gap-1 active:opacity-60"
          >
            <Icon size={22} color={color} />
            <Text
              style={{
                fontSize: 10,
                fontWeight: active ? '700' : '500',
                color,
                letterSpacing: 0.2,
              }}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
