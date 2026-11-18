/**
 * Métricas da fila de compras: pendências, SLA de 24h e totais do mês.
 *
 * O SLA depende do histórico de aprovação dos pedidos pendentes, então a
 * consulta é encadeada: primeiro os pedidos, depois o histórico deles.
 */
import { useQuery } from '@tanstack/react-query';

import {
  calculatePurchasingMetrics,
  type PurchasingMetrics,
} from '@/lib/orders/purchasing-sla';
import {
  loadManagerApprovalHistory,
  loadPurchasingOrders,
} from '@/services/sicoob/managerStatsService';

function inicioDoMes(agora: Date): string {
  return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
}

export function usePurchasingMetrics() {
  return useQuery<PurchasingMetrics>({
    queryKey: ['sicoob-purchasing-metrics'],
    queryFn: async () => {
      const agora = new Date();
      const [pendentes, doMes] = await Promise.all([
        loadPurchasingOrders('pending', inicioDoMes(agora)),
        loadPurchasingOrders('monthly', inicioDoMes(agora)),
      ]);
      const enviadoEm = await loadManagerApprovalHistory(
        (pendentes?.data ?? []).map((order) => order.id),
      );
      return calculatePurchasingMetrics(pendentes, doMes, agora, enviadoEm);
    },
  });
}
