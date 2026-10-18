import { Pressable, Text, View } from 'react-native'
import type { ExpenseWithNames } from '@family/types'

type Props = {
  expense: ExpenseWithNames
  currency?: string
  onPress: () => void
}

function formatAmount(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ExpenseRow({ expense, currency, onPress }: Props) {
  const categoryColor = expense.categoryColor ?? '#D1D0DA'

  return (
    <Pressable
      onPress={onPress}
      className="bg-foam rounded-2xl active:opacity-90"
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.985 : 1 }],
        shadowColor: '#1C1B2A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 2,
        overflow: 'hidden',
      })}
    >
      {/* Category accent bar on left */}
      <View className="flex-row">
        <View
          style={{
            width: 3,
            backgroundColor: categoryColor,
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
          }}
        />

        <View className="flex-1 flex-row items-center gap-3 px-4 py-3.5">
          {/* Description + meta */}
          <View className="flex-1 min-w-0">
            <Text
              className="text-sm font-semibold text-ink leading-snug"
              numberOfLines={1}
            >
              {expense.description ?? (
                <Text className="font-normal italic" style={{ color: '#AEABBE' }}>
                  No description
                </Text>
              )}
            </Text>
            {/* Meta line */}
            <View className="flex-row items-center flex-wrap mt-0.5" style={{ gap: 4 }}>
              {expense.categoryName ? (
                <View className="flex-row items-center" style={{ gap: 3 }}>
                  <View
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: categoryColor }}
                  />
                  <Text className="text-xs text-ink-muted">{expense.categoryName}</Text>
                </View>
              ) : null}
              {expense.categoryName && (expense.locationName || expense.paidByName) ? (
                <Text className="text-xs" style={{ color: '#C8C7D4' }}>·</Text>
              ) : null}
              {expense.locationName ? (
                <Text className="text-xs text-ink-muted">{expense.locationName}</Text>
              ) : null}
              {expense.locationName && expense.paidByName ? (
                <Text className="text-xs" style={{ color: '#C8C7D4' }}>·</Text>
              ) : null}
              {expense.paidByName ? (
                <Text className="text-xs text-ink-muted">{expense.paidByName}</Text>
              ) : null}
            </View>
          </View>

          {/* Amount + date */}
          <View className="items-end shrink-0">
            <Text
              className="text-sm font-bold text-ink tabular-nums"
              style={{ letterSpacing: -0.3 }}
            >
              {formatAmount(expense.amount, currency)}
            </Text>
            <Text className="text-xs text-ink-muted mt-0.5">
              {formatDate(expense.date)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}
