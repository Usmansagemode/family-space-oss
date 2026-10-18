import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native'
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchExpensesByMonth, deleteExpense, fetchCategories } from '@family/supabase'
import { useUserFamily, useFamily, useSpaces } from '@family/hooks'
import type { ExpenseWithNames } from '@family/types'
import { useAuthContext } from '../contexts/auth'
import { ExpenseRow } from '../components/ExpenseRow'
import { ExpenseDetailSheet } from '../components/ExpenseDetailSheet'
import { EditExpenseModal } from '../components/EditExpenseModal'

function useExpenses(familyId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['expenses', familyId, year, month],
    queryFn: () => fetchExpensesByMonth(familyId, year, month),
    enabled: !!familyId,
    staleTime: 2 * 60 * 1000,
  })
}

function useCategories(familyId: string) {
  return useQuery({
    queryKey: ['categories', familyId],
    queryFn: () => fetchCategories(familyId),
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000,
  })
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function formatTotal(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function ExpensesScreen() {
  const { user } = useAuthContext()
  const queryClient = useQueryClient()
  const { data: family } = useUserFamily(user?.id)
  const { data: familyData } = useFamily(family?.id ?? '')
  const { data: spaces = [] } = useSpaces(family?.id ?? '')
  const { data: categories = [] } = useCategories(family?.id ?? '')

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: expenses = [], isLoading, refetch } = useExpenses(family?.id ?? '', year, month)

  const [detailExpense, setDetailExpense] = useState<ExpenseWithNames | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [editExpense, setEditExpense] = useState<ExpenseWithNames | null>(null)
  const [editVisible, setEditVisible] = useState(false)

  const currency = familyData?.currency ?? 'USD'
  const locationSpaces = spaces.filter((s) => s.type === 'store' && !s.deletedAt)
  const personSpaces = spaces.filter((s) => s.type === 'person' && !s.deletedAt)

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', family?.id, year, month] })
    },
  })

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (isCurrentMonth) return
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  function openDetail(expense: ExpenseWithNames) {
    setDetailExpense(expense)
    setDetailVisible(true)
  }

  function openEdit(expense: ExpenseWithNames) {
    setEditExpense(expense)
    setEditVisible(true)
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F0' }}>
      {/* ── Header ── */}
      <View
        style={{
          paddingTop: 56,
          backgroundColor: '#FAFAF8',
          borderBottomWidth: 1,
          borderBottomColor: '#EEEDF4',
          shadowColor: '#1C1B2A',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Title */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 4 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: '#1C1B2A',
              letterSpacing: -0.5,
            }}
          >
            Expenses
          </Text>
        </View>

        {/* Month navigator */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 14,
            paddingTop: 8,
          }}
        >
          <Pressable
            onPress={prevMonth}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? '#EEEDF4' : 'rgba(28,27,42,0.06)',
            })}
          >
            <ChevronLeft size={18} color="#696680" />
          </Pressable>

          {/* Month + summary pill */}
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: '#1C1B2A',
                letterSpacing: -0.2,
              }}
            >
              {MONTHS[month - 1]} {year}
            </Text>
            {!isLoading && expenses.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'rgba(74,141,184,0.10)',
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 100,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#4A8DB8',
                  }}
                >
                  {expenses.length} transactions
                </Text>
                <View
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: '#4A8DB8',
                    opacity: 0.5,
                  }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#4A8DB8',
                  }}
                >
                  {formatTotal(total, currency)}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={nextMonth}
            disabled={isCurrentMonth}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isCurrentMonth ? 0.25 : 1,
              backgroundColor: (!isCurrentMonth && pressed) ? '#EEEDF4' : 'rgba(28,27,42,0.06)',
            })}
          >
            <ChevronRight size={18} color="#696680" />
          </Pressable>
        </View>
      </View>

      {/* ── List ── */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4A8DB8" />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 36,
            gap: 8,
          }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#4A8DB8" />
          }
          renderItem={({ item }) => (
            <ExpenseRow
              expense={item}
              currency={currency}
              onPress={() => openDetail(item)}
            />
          )}
          ListEmptyComponent={
            <View
              style={{
                alignItems: 'center',
                marginTop: 64,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: 'rgba(74,141,184,0.10)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Receipt size={28} color="#4A8DB8" strokeWidth={1.5} />
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#4A4858',
                  }}
                >
                  No expenses in {MONTHS_SHORT[month - 1]}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: '#8A8799',
                    textAlign: 'center',
                    lineHeight: 18,
                  }}
                >
                  Add expenses from the web app{'\n'}and they'll appear here.
                </Text>
              </View>
            </View>
          }
        />
      )}

      {/* ── Detail sheet ── */}
      <ExpenseDetailSheet
        expense={detailExpense}
        currency={currency}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onEdit={(expense) => {
          setDetailVisible(false)
          openEdit(expense)
        }}
        onDelete={(id) => {
          setDetailVisible(false)
          removeMutation.mutate(id)
        }}
      />

      {/* ── Edit modal ── */}
      <EditExpenseModal
        expense={editExpense}
        familyId={family?.id ?? ''}
        year={year}
        month={month}
        categories={categories}
        locationSpaces={locationSpaces}
        personSpaces={personSpaces}
        currency={currency}
        visible={editVisible}
        onClose={() => setEditVisible(false)}
      />
    </View>
  )
}
