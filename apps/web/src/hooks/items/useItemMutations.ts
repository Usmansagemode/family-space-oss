import { useItemMutationsCore } from '@family/hooks'

export { useItemMutationsCore }

export function useItemMutations(spaceId: string, familyId: string) {
  return useItemMutationsCore(spaceId, familyId)
}
