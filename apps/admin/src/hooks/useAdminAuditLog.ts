import { useQuery } from '@tanstack/react-query'
import { fetchAdminAuditLog } from '@family/supabase'

export function useAdminAuditLog(opts?: {
  page?: number
  action?: string
  since?: Date
  until?: Date
}) {
  return useQuery({
    queryKey: ['admin', 'audit-log', opts],
    queryFn: () => fetchAdminAuditLog(opts),
  })
}
