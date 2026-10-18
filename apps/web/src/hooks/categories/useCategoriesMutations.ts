import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveCategory,
  deleteCategory,
  reassignAndDeleteCategory,
  reorderCategories,
} from '@family/supabase'

export function useCategoriesMutations(familyId: string) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['categories', familyId] })
    void queryClient.invalidateQueries({ queryKey: ['expenses', familyId] })
  }

  const create = useMutation({
    mutationFn: (input: { name: string; color?: string; icon?: string }) =>
      createCategory({ familyId, ...input }),
    onSuccess: () => {
      invalidate()
      toast.success('Category created')
    },
    onError: () => {
      toast.error('Failed to create category')
    },
  })

  const update = useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string
      name?: string
      color?: string
      icon?: string
      sortOrder?: number
    }) => updateCategory(id, input),
    onSuccess: () => {
      invalidate()
    },
    onError: () => {
      toast.error('Failed to update category')
    },
  })

  const archive = useMutation({
    mutationFn: (id: string) => archiveCategory(id),
    onSuccess: () => {
      invalidate()
      toast.success('Category archived')
    },
    onError: () => {
      toast.error('Failed to archive category')
    },
  })

  const unarchive = useMutation({
    mutationFn: (id: string) => unarchiveCategory(id),
    onSuccess: () => {
      invalidate()
      toast.success('Category restored')
    },
    onError: () => {
      toast.error('Failed to restore category')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      invalidate()
      toast.success('Category deleted')
    },
    onError: () => {
      toast.error('Failed to delete category')
    },
  })

  const reassignAndRemove = useMutation({
    mutationFn: ({ oldId, newId }: { oldId: string; newId: string }) =>
      reassignAndDeleteCategory(oldId, newId),
    onSuccess: () => {
      invalidate()
      toast.success('Category reassigned and deleted')
    },
    onError: () => {
      toast.error('Failed to reassign category')
    },
  })

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => reorderCategories(orderedIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories', familyId] })
    },
    onError: () => {
      toast.error('Failed to reorder categories')
    },
  })

  return { create, update, archive, unarchive, remove, reassignAndRemove, reorder }
}
