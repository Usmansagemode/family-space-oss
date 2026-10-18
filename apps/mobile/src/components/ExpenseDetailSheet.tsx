import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native'
import { X, Trash2, Pencil } from 'lucide-react-native'
import type { ExpenseWithNames } from '@family/types'

type Props = {
  expense: ExpenseWithNames | null
  currency?: string
  visible: boolean
  onClose: () => void
  onEdit: (expense: ExpenseWithNames) => void
  onDelete: (id: string) => void
}

function formatAmount(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDateFull(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

type DetailRowProps = {
  label: string
  value: string | null
  color?: string | null
  isLast?: boolean
}

function DetailRow({ label, value, color, isLast }: DetailRowProps) {
  return (
    <View
      className="flex-row items-center py-3.5"
      style={!isLast ? { borderBottomWidth: 1, borderBottomColor: '#EEEDF4' } : undefined}
    >
      <Text
        className="text-xs font-semibold uppercase tracking-widest w-24 shrink-0"
        style={{ color: '#AEABBE' }}
      >
        {label}
      </Text>
      {value ? (
        <View className="flex-row items-center flex-1" style={{ gap: 6 }}>
          {color ? (
            <View
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
          ) : null}
          <Text className="text-sm font-medium text-ink flex-1">{value}</Text>
        </View>
      ) : (
        <Text className="text-sm flex-1" style={{ color: '#C8C7D4', fontStyle: 'italic' }}>
          Not set
        </Text>
      )}
    </View>
  )
}

export function ExpenseDetailSheet({ expense, currency, visible, onClose, onEdit, onDelete }: Props) {
  if (!expense) return null

  const categoryColor = expense.categoryColor ?? null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop — tappable to dismiss */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(28,27,42,0.45)' }}
        onPress={onClose}
      />

      {/* Sheet */}
      <View
        className="bg-foam rounded-t-3xl"
        style={{
          shadowColor: '#1C1B2A',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 12,
        }}
      >
        {/* Drag handle */}
        <View className="items-center pt-3 pb-2">
          <View
            className="rounded-full"
            style={{ width: 36, height: 4, backgroundColor: '#D1D0DA' }}
          />
        </View>

        {/* Header row */}
        <View className="flex-row items-start px-5 pb-3" style={{ gap: 12 }}>
          {/* Category color swatch */}
          {categoryColor ? (
            <View
              className="w-10 h-10 rounded-xl items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: `${categoryColor}28` }}
            >
              <View
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: categoryColor }}
              />
            </View>
          ) : (
            <View
              className="w-10 h-10 rounded-xl items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: 'rgba(28,27,42,0.06)' }}
            >
              <View className="w-4 h-4 rounded-full bg-line" />
            </View>
          )}

          <View className="flex-1 min-w-0">
            <Text className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              {expense.categoryName ?? 'Uncategorized'}
            </Text>
            <Text
              className="text-lg font-bold text-ink mt-0.5"
              numberOfLines={2}
              style={{ lineHeight: 24 }}
            >
              {expense.description ?? (
                <Text className="font-normal italic" style={{ color: '#AEABBE' }}>
                  No description
                </Text>
              )}
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={10}
            className="w-8 h-8 rounded-full items-center justify-center mt-0.5 shrink-0"
            style={{ backgroundColor: 'rgba(28,27,42,0.06)' }}
          >
            <X size={15} color="#8A8799" />
          </Pressable>
        </View>

        {/* Amount hero */}
        <View
          className="mx-5 mb-4 rounded-2xl px-5 py-4"
          style={{
            backgroundColor: categoryColor ? `${categoryColor}18` : 'rgba(28,27,42,0.04)',
            borderWidth: 1,
            borderColor: categoryColor ? `${categoryColor}30` : 'rgba(28,27,42,0.06)',
          }}
        >
          <Text
            className="font-bold text-ink tabular-nums"
            style={{ fontSize: 36, letterSpacing: -1, lineHeight: 42 }}
          >
            {formatAmount(expense.amount, currency)}
          </Text>
          <Text className="text-sm text-ink-muted mt-1">
            {formatDateFull(expense.date)}
          </Text>
        </View>

        {/* Details card */}
        <View
          className="mx-5 mb-5 rounded-2xl bg-sand px-4"
          style={{ borderWidth: 1, borderColor: '#EEEDF4' }}
        >
          <DetailRow label="Category" value={expense.categoryName} color={categoryColor} />
          <DetailRow label="Location" value={expense.locationName} />
          <DetailRow label="Paid by" value={expense.paidByName} isLast />
        </View>

        {/* Actions */}
        <View className="flex-row gap-3 px-5 pb-10" style={{ paddingBottom: 36 }}>
          <Pressable
            onPress={() => { onDelete(expense.id); onClose() }}
            className="flex-row items-center justify-center rounded-2xl"
            style={({ pressed }) => ({
              flex: 1,
              gap: 6,
              paddingVertical: 14,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              backgroundColor: pressed ? '#FEE2E2' : 'transparent',
              borderWidth: 1.5,
              borderColor: '#FECACA',
            })}
          >
            <Trash2 size={16} color="#E5484D" />
            <Text className="text-sm font-semibold" style={{ color: '#E5484D' }}>
              Delete
            </Text>
          </Pressable>

          <Pressable
            onPress={() => { onEdit(expense); onClose() }}
            className="flex-row items-center justify-center rounded-2xl"
            style={({ pressed }) => ({
              flex: 2,
              gap: 6,
              paddingVertical: 14,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              backgroundColor: pressed ? '#3A7DB5' : '#4A8DB8',
              shadowColor: '#4A8DB8',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            })}
          >
            <Pencil size={16} color="#fff" />
            <Text className="text-sm font-semibold text-white">Edit Expense</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
