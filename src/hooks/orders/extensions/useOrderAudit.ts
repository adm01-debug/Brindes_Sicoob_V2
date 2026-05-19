import { useQuery } from "@tanstack/react-query";
import { OrderService } from "@/services/OrderService";

export const useOrderAudit = (orderId?: string, filters?: { event_type?: string, search?: string }) => {
  const { data: auditEvents, isLoading } = useQuery({
    queryKey: ["order-audit", orderId, filters],
    queryFn: () => OrderService.listAuditEvents(orderId!, filters),
    enabled: !!orderId,
  });

  return {
    auditEvents,
    isLoading,
    totalCount: auditEvents?.length || 0,
    // Add pagination placeholders if needed by components
    page: 1,
    setPage: () => {},
    pageSize: 100
  };
};
