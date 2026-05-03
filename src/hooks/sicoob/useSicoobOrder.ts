import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sicoobOrderService } from "@/services/sicoob/orderService";
import { toast } from "sonner";

export const useSicoobOrder = (id?: string) => {
  return useQuery({
    queryKey: ["sicoob_order", id],
    queryFn: () => sicoobOrderService.getOrderById(id!),
    enabled: !!id,
  });
};

export const useSicoobOrderDetails = (orderId?: string) => {
  const itemsQuery = useQuery({
    queryKey: ["sicoob_order_items", orderId],
    queryFn: () => sicoobOrderService.getOrderItems(orderId!),
    enabled: !!orderId,
  });

  const logsQuery = useQuery({
    queryKey: ["sicoob_order_item_logs", orderId],
    queryFn: () => sicoobOrderService.getItemLogs(orderId!),
    enabled: !!orderId,
  });

  return {
    items: itemsQuery.data,
    isLoadingItems: itemsQuery.isLoading,
    logs: logsQuery.data,
    isLoadingLogs: logsQuery.isLoading,
  };
};
