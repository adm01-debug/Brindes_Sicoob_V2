export * from "./useOrderComments";
export * from "./useOrderInvoices";
export * from "./useOrderLogistics";
export * from "./useOrderAudit";
export * from "./useOrderPayments";
export * from "./useOrderPilotApprovals";

import { useOrderLogistics } from "./useOrderLogistics";

/** Adaptador do detalhe legado; a consulta continua vindo do serviço de logística real. */
export const useLogisticsTracking = (orderId?: string) => {
  const { logistics, isLoading } = useOrderLogistics(orderId);
  return { data: logistics, isLoading };
};
