import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchActivityLog } from '@family/supabase'
import { useFamilyMembers } from '../auth/useFamilyMembers'
import type { ActivityEvent } from '@family/types'

export type { ActivityEvent }

export function useActivityFeed(
  familyId: string | undefined,
  enabled: boolean,
) {
  const { data: members } = useFamilyMembers(familyId)

  const rawQuery = useQuery({
    queryKey: ['activity', familyId],
    queryFn: () => fetchActivityLog(familyId!),
    enabled: enabled && !!familyId,
    staleTime: 30_000,
  })

  // Resolve actor names outside the queryFn so this re-derives whenever
  // members loads — the query key alone won't trigger a re-fetch for that.
  const data = useMemo<ActivityEvent[] | undefined>(() => {
    if (!rawQuery.data) return undefined
    return rawQuery.data.map((row) => {
      const member = (members ?? []).find((m) => m.userId === row.actorId)
      return {
        id: row.id,
        eventType: row.eventType,
        payload: row.payload,
        actorId: row.actorId,
        actorName: member?.name ?? member?.email ?? null,
        timestamp: row.createdAt,
      }
    })
  }, [rawQuery.data, members])

  return { ...rawQuery, data }
}
