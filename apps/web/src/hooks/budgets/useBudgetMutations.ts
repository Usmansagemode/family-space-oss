import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { upsertBudget, deleteBudget } from '@family/supabase'
import type { BudgetPeriod } from '@family/types'

export function useBudgetMutations(familyId: string) {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['budgets', familyId] })

  const upsert = useMutation({
    mutationFn: (input: {
      personId: string | null
      categoryId: string | null
      amount: number
      period: BudgetPeriod
    }) => upsertBudget({ familyId, ...input }),
    onSuccess: () => { void invalidate(); toast.success('Budget saved') },
    onError: () => toast.error('Failed to save budget'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => { void invalidate(); toast.success('Budget removed') },
    onError: () => toast.error('Failed to remove budget'),
  })

  return { upsert, remove }
}
