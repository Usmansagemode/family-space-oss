import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProfile, updateProfile, uploadAvatar } from '@family/supabase'

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProfileMutations(userId: string) {
  const qc = useQueryClient()

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ['profile', userId] })
    // family members list also shows avatars
    void qc.invalidateQueries({ queryKey: ['family-members'] })
  }

  const saveName = useMutation({
    mutationFn: (name: string) => updateProfile(userId, { name }),
    onSuccess: invalidate,
  })

  const saveAvatar = useMutation({
    mutationFn: async (file: File) => {
      const url = await uploadAvatar(userId, file)
      await updateProfile(userId, { avatarUrl: url })
      return url
    },
    onSuccess: invalidate,
  })

  return { saveName, saveAvatar }
}
