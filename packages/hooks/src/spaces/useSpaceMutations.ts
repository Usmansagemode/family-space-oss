import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createSpace,
  updateSpace,
  deleteSpace,
  restoreSpace,
  reorderSpaces,
} from '@family/supabase'
import type { SpaceType } from '@family/types'

export function useSpaceMutations(familyId: string) {
  const queryClient = useQueryClient()
  const key = ['spaces', familyId]

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key })

  const create = useMutation({
    mutationFn: (input: { name: string; color: string; type: SpaceType; showInExpenses?: boolean }) =>
      createSpace({ familyId, ...input }),
    onSuccess: () => {
      void invalidate()
      toast.success('Space created')
    },
    onError: () => {
      toast.error('Failed to create space')
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
      type?: SpaceType
      showInExpenses?: boolean
      assignedPersonId?: string | null
    }) => updateSpace(id, input),
    onSuccess: () => {
      void invalidate()
      toast.success('Space updated')
    },
    onError: () => {
      toast.error('Failed to update space')
    },
  })

  const assign = useMutation({
    mutationFn: ({
      id,
      assignedPersonId,
    }: {
      id: string
      assignedPersonId: string | null
    }) => updateSpace(id, { assignedPersonId }),
    onSuccess: (_data, { assignedPersonId }) => {
      void invalidate()
      toast.success(assignedPersonId ? 'Store assigned' : 'Assignment removed')
    },
    onError: () => {
      toast.error('Failed to update assignment')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteSpace(id, familyId),
    onSuccess: () => {
      void invalidate()
      toast.success('Space deleted')
    },
    onError: () => {
      toast.error('Failed to delete space')
    },
  })

  const restore = useMutation({
    mutationFn: (id: string) => restoreSpace(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: ['spaces-archived', familyId] })
      toast.success('Member restored')
    },
    onError: () => {
      toast.error('Failed to restore member')
    },
  })

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => reorderSpaces(orderedIds),
    onSuccess: () => {
      void invalidate()
    },
    onError: () => {
      toast.error('Failed to reorder spaces')
    },
  })

  const toggleShowInExpenses = useMutation({
    mutationFn: ({ id, showInExpenses }: { id: string; showInExpenses: boolean }) =>
      updateSpace(id, { showInExpenses }),
    onSuccess: () => {
      void invalidate()
    },
    onError: () => {
      toast.error('Failed to update space')
    },
  })

  return { create, update, assign, remove, restore, reorder, toggleShowInExpenses }
}
