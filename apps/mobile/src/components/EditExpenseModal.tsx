import { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateExpense, deleteExpense } from '@family/supabase'
import type { Category, ExpenseWithNames, Space } from '@family/types'

const ACCENT = '#4A8DB8'
const ACCENT_LIGHT = 'rgba(74,141,184,0.10)'
const MUTED = '#8A8799'
const LINE = '#EEEDF4'

// ─── date helpers (no UTC shift) ─────────────────────────────────────────────

function today() {
  const d = new Date()
  return toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseDate(str: string): [number, number, number] {
  const [y, m, d] = str.split('-').map(Number)
  return [y, m, d]
}

function shiftDay(dateStr: string, delta: number) {
  const [y, m, d] = parseDate(dateStr)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return toDateStr(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
}

function formatDateDisplay(dateStr: string) {
  const [y, m, d] = parseDate(dateStr)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── chip selector ────────────────────────────────────────────────────────────

type ChipItem = { id: string; label: string; color?: string | null }

function ChipRow({
  items,
  selected,
  onSelect,
}: {
  items: ChipItem[]
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  if (items.length === 0) {
    return (
      <Text style={{ fontSize: 13, color: MUTED, fontStyle: 'italic' }}>None available</Text>
    )
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      {items.map((item) => {
        const active = selected === item.id
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(active ? null : item.id)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 100,
              borderWidth: 1.5,
              transform: [{ scale: pressed ? 0.95 : 1 }],
              backgroundColor: active ? ACCENT : pressed ? LINE : 'transparent',
              borderColor: active ? ACCENT : LINE,
            })}
          >
            {item.color ? (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: active ? 'rgba(255,255,255,0.7)' : item.color,
                }}
              />
            ) : null}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: active ? '#fff' : '#4A4858',
                letterSpacing: 0.1,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

// ─── section label ────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: MUTED,
        marginBottom: 10,
      }}
    >
      {text}
    </Text>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

type Props = {
  expense: ExpenseWithNames | null
  familyId: string
  year: number
  month: number
  categories: Category[]
  locationSpaces: Space[]
  personSpaces: Space[]
  currency?: string
  visible: boolean
  onClose: () => void
}

export function EditExpenseModal({
  expense,
  familyId,
  year,
  month,
  categories,
  locationSpaces,
  personSpaces,
  visible,
  onClose,
}: Props) {
  const queryClient = useQueryClient()

  const [amountStr, setAmountStr] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(today())
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [paidById, setPaidById] = useState<string | null>(null)

  useEffect(() => {
    if (visible && expense) {
      setAmountStr(String(expense.amount))
      setDescription(expense.description ?? '')
      setDate(expense.date)
      setCategoryId(expense.categoryId)
      setLocationId(expense.locationId)
      setPaidById(expense.paidById)
    }
  }, [visible, expense])

  const update = useMutation({
    mutationFn: (patch: Parameters<typeof updateExpense>[1]) =>
      updateExpense(expense!.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId, year, month] })
      onClose()
    },
  })

  const remove = useMutation({
    mutationFn: () => deleteExpense(expense!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', familyId, year, month] })
      onClose()
    },
  })

  const amount = parseFloat(amountStr)
  const canSave = !isNaN(amount) && amount > 0 && !!date && !update.isPending

  function handleSave() {
    if (!canSave || !expense) return
    update.mutate({
      amount,
      date,
      description: description.trim() || undefined,
      categoryId,
      locationId,
      paidById,
    })
  }

  function handleDelete() {
    if (!expense) return
    Alert.alert(
      'Delete expense',
      `Are you sure you want to delete this expense?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
      ],
    )
  }

  const isPending = update.isPending || remove.isPending

  const categoryChips: ChipItem[] = categories
    .filter((c) => !c.deletedAt || c.id === expense?.categoryId)
    .map((c) => ({ id: c.id, label: c.name, color: c.color ?? undefined }))

  const locationChips: ChipItem[] = locationSpaces.map((s) => ({
    id: s.id,
    label: s.name,
    color: s.color ?? undefined,
  }))

  const personChips: ChipItem[] = personSpaces.map((s) => ({
    id: s.id,
    label: s.name,
    color: s.color ?? undefined,
  }))

  const isToday = date === today()
  const isYesterday = date === yesterday()
  const atToday = date >= today()

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: '#F5F4F0' }}
      >
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
            backgroundColor: '#FAFAF8',
            borderBottomWidth: 1,
            borderBottomColor: LINE,
          }}
        >
          <Pressable onPress={onClose} hitSlop={12} disabled={isPending}>
            <Text style={{ fontSize: 16, color: MUTED, fontWeight: '400' }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1C1B2A' }}>
            Edit Expense
          </Text>
          <Pressable onPress={handleSave} hitSlop={12} disabled={!canSave}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: canSave ? ACCENT : '#C8C7D4',
              }}
            >
              {update.isPending ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 }}
        >
          {/* ── Amount card (hero section) ── */}
          <View
            style={{
              margin: 16,
              borderRadius: 20,
              backgroundColor: '#FAFAF8',
              borderWidth: 1,
              borderColor: LINE,
              alignItems: 'center',
              paddingVertical: 24,
              paddingHorizontal: 20,
              shadowColor: '#1C1B2A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: MUTED,
                marginBottom: 12,
              }}
            >
              Amount
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: '300',
                  color: '#AEABBE',
                  lineHeight: 52,
                }}
              >
                $
              </Text>
              <TextInput
                value={amountStr}
                onChangeText={(t) => {
                  const clean = t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
                  setAmountStr(clean)
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#D1D0DA"
                selectTextOnFocus
                style={{
                  fontSize: 52,
                  fontWeight: '700',
                  color: '#1C1B2A',
                  textAlign: 'center',
                  minWidth: 120,
                  letterSpacing: -1,
                  lineHeight: 60,
                }}
              />
            </View>
            {/* Underline hint */}
            <View
              style={{
                height: 2,
                width: 80,
                borderRadius: 1,
                backgroundColor: canSave ? ACCENT : LINE,
                marginTop: 4,
              }}
            />
          </View>

          {/* ── Description + Date group ── */}
          <View style={{ marginHorizontal: 16, gap: 0 }}>
            {/* Description */}
            <View
              style={{
                backgroundColor: '#FAFAF8',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: LINE,
                marginBottom: 10,
                shadowColor: '#1C1B2A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
                <SectionLabel text="Description" />
              </View>
              <TextInput
                placeholder="What was this for? (optional)"
                placeholderTextColor="#C8C7D4"
                value={description}
                onChangeText={setDescription}
                returnKeyType="done"
                style={{
                  fontSize: 15,
                  color: '#1C1B2A',
                  paddingHorizontal: 16,
                  paddingBottom: 14,
                  fontWeight: '400',
                }}
              />
            </View>

            {/* Date */}
            <View
              style={{
                backgroundColor: '#FAFAF8',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: LINE,
                paddingHorizontal: 16,
                paddingTop: 14,
                paddingBottom: 14,
                shadowColor: '#1C1B2A',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <SectionLabel text="Date" />

              {/* Quick chips */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {(['Today', 'Yesterday'] as const).map((label) => {
                  const val = label === 'Today' ? today() : yesterday()
                  const active = label === 'Today' ? isToday : isYesterday
                  return (
                    <Pressable
                      key={label}
                      onPress={() => setDate(val)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 100,
                        borderWidth: 1.5,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                        backgroundColor: active ? ACCENT : pressed ? LINE : 'transparent',
                        borderColor: active ? ACCENT : LINE,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: active ? '#fff' : '#4A4858',
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              {/* Day navigator */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: LINE,
                  backgroundColor: '#F5F4F0',
                  overflow: 'hidden',
                }}
              >
                <Pressable
                  onPress={() => setDate(shiftDay(date, -1))}
                  hitSlop={4}
                  style={({ pressed }) => ({
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: pressed ? LINE : 'transparent',
                  })}
                >
                  <ChevronLeft size={18} color="#696680" />
                </Pressable>

                <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1B2A' }}>
                    {formatDateDisplay(date)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setDate(shiftDay(date, 1))}
                  disabled={atToday}
                  hitSlop={4}
                  style={({ pressed }) => ({
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    opacity: atToday ? 0.25 : 1,
                    backgroundColor: pressed && !atToday ? LINE : 'transparent',
                  })}
                >
                  <ChevronRight size={18} color="#696680" />
                </Pressable>
              </View>
            </View>
          </View>

          {/* ── Category ── */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 10,
              backgroundColor: '#FAFAF8',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: LINE,
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 14,
              shadowColor: '#1C1B2A',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <SectionLabel text="Category" />
            <ChipRow items={categoryChips} selected={categoryId} onSelect={setCategoryId} />
          </View>

          {/* ── Location ── */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 10,
              backgroundColor: '#FAFAF8',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: LINE,
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 14,
              shadowColor: '#1C1B2A',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <SectionLabel text="Location" />
            <ChipRow items={locationChips} selected={locationId} onSelect={setLocationId} />
          </View>

          {/* ── Paid by ── */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 10,
              backgroundColor: '#FAFAF8',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: LINE,
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 14,
              shadowColor: '#1C1B2A',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <SectionLabel text="Paid by" />
            <ChipRow items={personChips} selected={paidById} onSelect={setPaidById} />
          </View>

          {/* ── Save button ── */}
          <View style={{ marginHorizontal: 16, marginTop: 24 }}>
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => ({
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                transform: [{ scale: pressed && canSave ? 0.98 : 1 }],
                backgroundColor: canSave ? ACCENT : '#E5E3DE',
                shadowColor: canSave ? ACCENT : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: canSave ? 4 : 0,
              })}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  letterSpacing: 0.2,
                  color: canSave ? '#fff' : '#AEABBE',
                }}
              >
                {update.isPending ? 'Saving…' : 'Save Changes'}
              </Text>
            </Pressable>

            {/* Delete */}
            <Pressable
              onPress={handleDelete}
              disabled={isPending}
              hitSlop={8}
              style={({ pressed }) => ({
                alignItems: 'center',
                paddingVertical: 14,
                marginTop: 4,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#E5484D',
                }}
              >
                {remove.isPending ? 'Deleting…' : 'Delete expense'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}
