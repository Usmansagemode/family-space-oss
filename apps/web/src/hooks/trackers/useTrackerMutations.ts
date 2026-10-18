import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createTracker,
  updateTracker,
  deleteTracker,
  addTrackerEntry,
  deleteTrackerEntry,
} from '@family/supabase'

export function useTrackerMutations(familyId: string) {
  const queryClient = useQueryClient()

  const invalidateTrackers = () =>
    queryClient.invalidateQueries({ queryKey: ['trackers', familyId] })

  const invalidateEntries = (trackerId: string) =>
    queryClient.invalidateQueries({ queryKey: ['tracker-entries', trackerId] })

  const create = useMutation({
    mutationFn: (input: {
      title: string
      description?: string
      initialBalance: number
      color?: string
    }) => createTracker({ familyId, ...input }),
    onSuccess: () => {
      void invalidateTrackers()
      toast.success('Tracker created')
    },
    onError: () => {
      toast.error('Failed to create tracker')
    },
  })

  const update = useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string
      title?: string
      description?: string
      color?: string
    }) => updateTracker(id, input),
    onSuccess: () => {
      void invalidateTrackers()
    },
    onError: () => {
      toast.error('Failed to update tracker')
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteTracker(id),
    onSuccess: () => {
      void invalidateTrackers()
      toast.success('Tracker deleted')
    },
    onError: () => {
      toast.error('Failed to delete tracker')
    },
  })

  const addEntry = useMutation({
    mutationFn: (input: {
      trackerId: string
      date: string
      debit: number
      credit: number
      description?: string
    }) =>
      addTrackerEntry({
        trackerId: input.trackerId,
        familyId,
        date: input.date,
        debit: input.debit,
        credit: input.credit,
        description: input.description,
      }),
    onSuccess: (_data, variables) => {
      void invalidateTrackers()
      void invalidateEntries(variables.trackerId)
      toast.success('Entry added')
    },
    onError: () => {
      toast.error('Failed to add entry')
    },
  })

  const removeEntry = useMutation({
    mutationFn: (input: {
      entryId: string
      trackerId: string
      debit: number
      credit: number
    }) =>
      deleteTrackerEntry(
        input.entryId,
        input.trackerId,
        input.debit,
        input.credit,
      ),
    onSuccess: (_data, variables) => {
      void invalidateTrackers()
      void invalidateEntries(variables.trackerId)
      toast.success('Entry removed')
    },
    onError: () => {
      toast.error('Failed to remove entry')
    },
  })

  return { create, update, remove, addEntry, removeEntry }
}
