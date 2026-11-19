/**
 * Indicadores da Singular para qualquer tela que precise deles.
 *
 * Mesma chave de cache do painel de indicadores (`sicoob-gestor-stats`), então
 * abrir as duas telas não dispara as consultas duas vezes.
 */
import { useQuery } from '@tanstack/react-query';

import {
  getCooperativeDashboardStats,
  type GestorStats,
} from '@/services/sicoob/managerStatsService';

export function useManagerDashboardStats(cooperativeId?: string | null) {
  return useQuery<GestorStats | null>({
    queryKey: ['sicoob-gestor-stats', cooperativeId],
    queryFn: () => getCooperativeDashboardStats(cooperativeId),
    enabled: Boolean(cooperativeId),
  });
}
