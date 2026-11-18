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

export function usePurchasingMetrics(cooperativeId: string | null) {
  return useQuery<PurchasingMetrics>({
    queryKey: ['sicoob-purchasing-metrics', cooperativeId],
    enabled: Boolean(cooperativeId),
    // Aprovar um pedido muda a fila e o SLA. A configuração global desliga a
    // revalidação ao remontar, então voltar de /gestor/aprovacoes mostraria o
    // número da fila anterior enquanto o cache existisse.
    refetchOnMount: 'always',
    staleTime: 0,
    queryFn: async () => {
      const agora = new Date();
      const coop = cooperativeId as string;
      const [pendentes, doMes] = await Promise.all([
        loadPurchasingOrders('pending', inicioDoMes(agora), coop),
        loadPurchasingOrders('monthly', inicioDoMes(agora), coop),
      ]);
      // O SLA olha os pedidos do mês que já foram aprovados, por isso o
      // histórico vem dos pedidos do mês, não só dos pendentes.
      const decisoes = await loadManagerApprovalHistory(
        (doMes?.data ?? []).map((order) => order.id),
      );
      return calculatePurchasingMetrics(pendentes, doMes, decisoes);
    },
  });
}
