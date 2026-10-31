import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OrderService } from "@/services/OrderService";
import { requireOrderId } from "@/hooks/orders/require-order-id";

export interface OrderAuditStatusValue {
  fulfillment_status?: string;
  sla_status?: string;
}

export interface OrderAuditEvent {
  id: string;
  order_id: string;
  event_type: string;
  event_category: string;
  category: string | null;
  description: string;
  observations: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  created_by_name: string | null;
  metadata?: Record<string, unknown> | null;
  occurred_at?: string;
  created_at?: string;
  old_value?: OrderAuditStatusValue | null;
  new_value?: OrderAuditStatusValue | null;
}

export interface OrderAuditFilters {
  event_type?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const useOrderAudit = (orderId?: string, filters?: OrderAuditFilters) => {
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const { data, isLoading } = useQuery({
    queryKey: ["order-audit", orderId, filters],
    queryFn: () => OrderService.listAuditEvents(requireOrderId(orderId), filters) as Promise<OrderAuditEvent[]>,
    enabled: !!orderId,
  });

  return {
    auditEvents: data,
    isLoading,
    totalCount: data?.length ?? 0,
    page,
    setPage,
    pageSize,
  };
};
