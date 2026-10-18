import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAllInvites, revokeInvite } from '@family/supabase'
import { useAdminAuth } from '@/contexts/auth'
import { toast } from 'sonner'

export function useAdminInvites() {
  return useQuery({
    queryKey: ['admin', 'invites'],
    queryFn: fetchAllInvites,
  })
}

export function useAdminInviteMutations() {
  const qc = useQueryClient()
  const { adminUser } = useAdminAuth()
  const adminId = adminUser?.id ?? ''

  const revoke = useMutation({
    mutationFn: ({ token }: { token: string }) => revokeInvite(token, adminId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'invites'] })
      toast.success('Invite revoked')
    },
    onError: () => toast.error('Failed to revoke invite'),
  })

  return { revoke }
}
