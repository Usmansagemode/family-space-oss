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
import {
  createCalendarEvent,
  deleteCalendarEvent,
  syncCalendarOnUpdate,
  withGcalRetry,
  GcalAuthError,
} from '@family/api'
import { advanceDate, formatDate } from '@family/utils'
import type { Item, Recurrence } from '@family/types'

type ItemMutationOpts = {
  calendarId: string | null
  getToken: () => Promise<string | null>
  refreshToken: () => Promise<string | null>
}

// Core hook — no context imports, fully portable.
export function useItemMutationsCore(spaceId: string, familyId: string, opts: ItemMutationOpts) {
  const { calendarId, getToken, refreshToken } = opts
  const queryClient = useQueryClient()
  const key = ['items', spaceId]

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key })

  const create = useMutation({
    mutationFn: async (input: {
      title: string
      description?: string
      quantity?: string
      startDate?: Date
      endDate?: Date
      recurrence?: Recurrence
    }) => {
      let googleEventId: string | undefined
      if (calendarId && input.startDate) {
        try {
          const result = await withGcalRetry(getToken, refreshToken, (token) =>
            createCalendarEvent(token, calendarId, {
              title: input.title,
              startDate: input.startDate!,
              endDate: input.endDate,
            }),
          )
          googleEventId = result?.id
        } catch (err) {
          if (err instanceof GcalAuthError) toast.error('Google Calendar disconnected — go to Settings → Account to reconnect.')
          else console.error('[gcal] create event failed:', err)
        }
      }
      return createItem({ familyId, spaceId, ...input, googleEventId })
    },
    onSuccess: () => {
      void invalidate()
      toast.success('Item added')
    },
    onError: () => {
      toast.error('Failed to add item')
    },
  })

  const update = useMutation({
    mutationFn: async (input: {
      id: string
      title?: string
      description?: string
      quantity?: string | null
      startDate?: Date
      endDate?: Date
      recurrence?: Recurrence | null
    }) => {
      const cached = queryClient
        .getQueryData<Item[]>(key)
        ?.find((i) => i.id === input.id)

      let googleEventId: string | null | undefined
      try {
        googleEventId = await withGcalRetry(getToken, refreshToken, (token) =>
          syncCalendarOnUpdate(token, calendarId, {
            existingEventId: cached?.googleEventId,
            title: input.title ?? cached?.title ?? '',
            prevTitle: cached?.title ?? '',
            startDate: input.startDate,
            endDate: input.endDate,
          }),
        )
      } catch (err) {
        if (err instanceof GcalAuthError) toast.error('Google Calendar disconnected — go to Settings → Account to reconnect.')
        else console.error('[gcal] update sync failed:', err)
      }

      return updateItem(input.id, {
        title: input.title,
        description: input.description,
        quantity: input.quantity,
        startDate: input.startDate,
        endDate: input.endDate,
        recurrence: input.recurrence,
        ...(googleEventId !== undefined && { googleEventId }),
      })
    },
    onSuccess: () => {
      void invalidate()
      toast.success('Item updated')
    },
    onError: () => {
      toast.error('Failed to update item')
    },
  })

  const complete = useMutation({
    mutationFn: async (item: Item) => {
      let newEventId: string | null = null
      if (item.recurrence && item.startDate) {
        const nextStart = advanceDate(item.startDate, item.recurrence)
        const nextEnd = item.endDate ? advanceDate(item.endDate, item.recurrence) : undefined
        try {
          if (calendarId && item.googleEventId) {
            await withGcalRetry(getToken, refreshToken, (token) =>
              deleteCalendarEvent(token, calendarId, item.googleEventId!),
            )
          }
          if (calendarId) {
            const result = await withGcalRetry(getToken, refreshToken, (token) =>
              createCalendarEvent(token, calendarId, {
                title: item.title,
                startDate: nextStart,
                endDate: nextEnd,
              }),
            )
            newEventId = result?.id ?? null
          }
        } catch (err) {
          if (err instanceof GcalAuthError) toast.error('Google Calendar disconnected — go to Settings → Account to reconnect.')
          else console.error('[gcal] complete sync failed:', err)
        }
        return advanceRecurringItem(item.id, nextStart, nextEnd, newEventId)
      }
      try {
        if (calendarId && item.googleEventId) {
          await withGcalRetry(getToken, refreshToken, (token) =>
            deleteCalendarEvent(token, calendarId, item.googleEventId!),
          )
        }
      } catch (err) {
        console.error('[gcal] complete sync failed:', err)
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
    mutationFn: async (item: Item) => {
      try {
        if (calendarId && item.googleEventId) {
          await withGcalRetry(getToken, refreshToken, (token) =>
            deleteCalendarEvent(token, calendarId, item.googleEventId!),
          )
        }
      } catch (err) {
        if (err instanceof GcalAuthError) toast.error('Google Calendar disconnected — go to Settings → Account to reconnect.')
        else console.error('[gcal] delete sync failed:', err)
      }
      return deleteItem(item.id)
    },
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
