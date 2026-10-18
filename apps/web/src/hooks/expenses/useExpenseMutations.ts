import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createExpense,
  updateExpense,
  deleteExpense,
  deleteExpenses,
} from '@family/supabase'

export function useExpenseMutations(
  familyId: string,
  year: number,
  month: number,
) {
  const queryClient = useQueryClient()
  const key = ['expenses', familyId, year, month]

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key })

  const create = useMutation({
    mutationFn: (input: {
      amount: number
      date: string
      description?: string
      categoryId?: string | null
      categoryName?: string
      locationId?: string | null
      paidById?: string | null
    }) =>
      createExpense({
        familyId,
        amount: input.amount,
        date: input.date,
        description: input.description,
        categoryId: input.categoryId,
        categoryName: input.categoryName,
        locationId: input.locationId,
        paidById: input.paidById,
      }),
    onSuccess: () => {
      void invalidate()
      toast.success('Expense added')
    },
    onError: () => {
      toast.error('Failed to add expense')
    },
  })

  const update = useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string
      amount?: number
      date?: string
      description?: string
      categoryId?: string | null
      locationId?: string | null
      paidById?: string | null
    }) => updateExpense(id, input),
    onSuccess: () => {
      void invalidate()
    },
    onError: () => {
      toast.error('Failed to update expense')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteExpense(id, familyId),
    onSuccess: () => {
      void invalidate()
      toast.success('Expense deleted')
    },
    onError: () => {
      toast.error('Failed to delete expense')
    },
  })

  const removeMany = useMutation({
    mutationFn: (ids: string[]) => deleteExpenses(ids, familyId),
    onSuccess: () => {
      void invalidate()
      toast.success('Expenses deleted')
    },
    onError: () => {
      toast.error('Failed to delete expenses')
    },
  })

  /** Apply the same patch to multiple expenses (e.g. bulk category assignment). */
  const bulkUpdateUniform = useMutation({
    mutationFn: ({
      ids,
      patch,
    }: {
      ids: string[]
      patch: {
        categoryId?: string | null
        locationId?: string | null
        paidById?: string | null
        description?: string
        date?: string
        amount?: number
      }
    }) => Promise.all(ids.map((id) => updateExpense(id, patch))),
    onSuccess: (_, { ids }) => {
      void invalidate()
      toast.success(`Updated ${ids.length} expense${ids.length !== 1 ? 's' : ''}`)
    },
    onError: () => {
      void invalidate()
      toast.error('Failed to bulk update expenses')
    },
  })

  /** Apply a per-item patch to each expense (e.g. Quick Tag saves). */
  const bulkUpdatePerItem = useMutation({
    mutationFn: (
      updates: Array<{
        id: string
        patch: {
          categoryId?: string | null
          locationId?: string | null
          paidById?: string | null
        }
      }>,
    ) => Promise.all(updates.map(({ id, patch }) => updateExpense(id, patch))),
    onSuccess: (_, updates) => {
      void invalidate()
      toast.success(`Saved ${updates.length} expense${updates.length !== 1 ? 's' : ''}`)
    },
    onError: () => {
      void invalidate()
      toast.error('Failed to save expenses')
    },
  })

  return { create, update, remove, removeMany, bulkUpdateUniform, bulkUpdatePerItem }
}
