import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createSplitGroup, updateSplitGroup, deleteSplitGroup } from '@family/supabase'

export function useSplitGroupMutations(familyId: string) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['split-groups', familyId] })

  const create = useMutation({
    mutationFn: createSplitGroup,
    onSuccess: invalidate,
    onError: (err: Error) => {
      if (err.message.includes('split_group_limit_reached')) {
        toast.error('Group limit reached. Upgrade your plan to create more split groups.')
      } else {
        toast.error('Failed to create group')
      }
    },
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name?: string; description?: string } }) =>
      updateSplitGroup(id, input),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: deleteSplitGroup,
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
