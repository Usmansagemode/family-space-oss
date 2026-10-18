import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createItem,
  updateItem,
  completeItem,
  deleteItem,
  reAddItem,
  moveItem,
  advanceRecurringItem,
} from '@family/supabase'
import { advanceDate, formatDate } from '@family/utils'
import type { Item, Recurrence } from '@family/types'

// Core hook — no context imports, fully portable.
export function useItemMutationsCore(spaceId: string, familyId: string) {
  const queryClient = useQueryClient()
  const key = ['items', spaceId]

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key })

  const create = useMutation({
    mutationFn: (input: {
      title: string
      description?: string
      quantity?: string
      startDate?: Date
      endDate?: Date
      recurrence?: Recurrence
    }) => createItem({ familyId, spaceId, ...input }),
    onSuccess: () => {
      void invalidate()
      toast.success('Item added')
    },
    onError: () => {
      toast.error('Failed to add item')
    },
  })

  const update = useMutation({
    mutationFn: (input: {
      id: string
      title?: string
      description?: string
      quantity?: string | null
      startDate?: Date
      endDate?: Date
      recurrence?: Recurrence | null
    }) =>
      updateItem(input.id, {
        title: input.title,
        description: input.description,
        quantity: input.quantity,
        startDate: input.startDate,
        endDate: input.endDate,
        recurrence: input.recurrence,
      }),
    onSuccess: () => {
      void invalidate()
      toast.success('Item updated')
    },
    onError: () => {
      toast.error('Failed to update item')
    },
  })

  const complete = useMutation({
    mutationFn: (item: Item) => {
      if (item.recurrence && item.startDate) {
        const nextStart = advanceDate(item.startDate, item.recurrence)
        const nextEnd = item.endDate ? advanceDate(item.endDate, item.recurrence) : undefined
        return advanceRecurringItem(item.id, nextStart, nextEnd)
      }
      return completeItem(item.id)
    },
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData<Item[]>(key)
      if (item.recurrence && item.startDate) {
        const nextStart = advanceDate(item.startDate, item.recurrence)
        queryClient.setQueryData<Item[]>(key, (old) =>
          old?.map((i) =>
            i.id === item.id ? { ...i, startDate: nextStart } : i,
          ),
        )
      } else {
        queryClient.setQueryData<Item[]>(key, (old) =>
          old?.map((i) =>
            i.id === item.id
              ? { ...i, completed: true, completedAt: new Date() }
              : i,
          ),
        )
      }
      return { prev }
    },
    onSuccess: (_data, item) => {
      if (item.recurrence && item.startDate) {
        toast.success(
          `Rescheduled to ${formatDate(advanceDate(item.startDate, item.recurrence))}`,
        )
      } else {
        toast.success('Marked as done')
      }
    },
    onError: (_err, _item, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev)
      toast.error('Failed to complete item')
    },
    onSettled: () => {
      void invalidate()
    },
  })

  const remove = useMutation({
    mutationFn: (item: Item) => deleteItem(item.id),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData<Item[]>(key)
      queryClient.setQueryData<Item[]>(key, (old) =>
        old?.filter((i) => i.id !== item.id),
      )
      return { prev }
    },
    onError: (_err, _item, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev)
      toast.error('Failed to delete item')
    },
    onSettled: () => {
      void invalidate()
    },
  })

  const reAdd = useMutation({
    mutationFn: (original: Item) => reAddItem(original),
    onMutate: async (original) => {
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData<Item[]>(key)
      queryClient.setQueryData<Item[]>(key, (old) =>
        old?.map((i) =>
          i.id === original.id
            ? { ...i, completed: false, completedAt: undefined }
            : i,
        ),
      )
      return { prev }
    },
    onSuccess: () => {
      toast.success('Item re-added')
    },
    onError: (_err, _item, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev)
      toast.error('Failed to re-add item')
    },
    onSettled: () => {
      void invalidate()
    },
  })

  const move = useMutation({
    mutationFn: ({ id, newSpaceId }: { id: string; newSpaceId: string }) =>
      moveItem(id, newSpaceId),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData<Item[]>(key)
      queryClient.setQueryData<Item[]>(
        key,
        (old) => old?.filter((i) => i.id !== id) ?? [],
      )
      return { prev }
    },
    onSuccess: (_data, { newSpaceId }) => {
      void queryClient.invalidateQueries({ queryKey: ['items', newSpaceId] })
      toast.success('Item moved')
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev)
      toast.error('Failed to move item')
    },
    onSettled: () => void invalidate(),
  })

  return { create, update, complete, remove, reAdd, move }
}
