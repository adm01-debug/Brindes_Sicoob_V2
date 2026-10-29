import { useQuery } from '@tanstack/react-query';
import { managerStatsService } from '@/services/sicoob/managerStatsService';

export function useManagerDashboardStats(cooperativeId?: string | null) {
  return useQuery({
    queryKey: ['sicoob-gestor-stats', cooperativeId],
    queryFn: () => managerStatsService.getCooperativeDashboardStats(cooperativeId),
    enabled: Boolean(cooperativeId),
  });
}
