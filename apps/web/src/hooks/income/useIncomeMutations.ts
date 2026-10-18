import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createIncomeEntry, updateIncomeEntry, deleteIncomeEntry } from '@family/supabase'
import type { IncomeType } from '@family/types'

export function useIncomeMutations(familyId: string, year: number, month: number) {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['income-entries', familyId, year, month] })

  const create = useMutation({
    mutationFn: (input: {
      personId?: string | null
      type?: IncomeType | null
      amount: number
      date: string
      description?: string
    }) => createIncomeEntry({ familyId, ...input }),
    onSuccess: () => { void invalidate(); toast.success('Income logged') },
    onError: () => toast.error('Failed to log income'),
  })

  const update = useMutation({
    mutationFn: ({ id, ...input }: {
      id: string
      personId?: string | null
      type?: IncomeType | null
      amount?: number
      date?: string
      description?: string | null
    }) => updateIncomeEntry(id, input),
    onSuccess: () => { void invalidate(); toast.success('Income updated') },
    onError: () => toast.error('Failed to update income'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteIncomeEntry(id),
    onSuccess: () => { void invalidate(); toast.success('Income removed') },
    onError: () => toast.error('Failed to remove income'),
  })

  return { create, update, remove }
}
