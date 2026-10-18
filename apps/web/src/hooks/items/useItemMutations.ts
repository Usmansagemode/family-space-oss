import { useItemMutationsCore } from '@family/hooks'
import { useBoardContext } from '#/contexts/board'
import { useAuthContext } from '#/contexts/auth'

export { useItemMutationsCore }

// Web wrapper — fills in opts from React contexts.
export function useItemMutations(spaceId: string, familyId: string) {
  const { calendarId, providerToken } = useBoardContext()
  const { refreshProviderToken } = useAuthContext()

  return useItemMutationsCore(spaceId, familyId, {
    calendarId,
    getToken: () =>
      providerToken ? Promise.resolve(providerToken) : refreshProviderToken(),
    refreshToken: refreshProviderToken,
  })
}
