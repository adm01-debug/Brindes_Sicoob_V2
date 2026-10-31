import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sicoobOrderService } from "@/services/sicoob/orderService";
import { toast } from "sonner";
import { requireOrderId } from "@/hooks/orders/require-order-id";

export const useSicoobOrder = (id?: string) => {
  return useQuery({
    queryKey: ["sicoob_order", id],
    queryFn: () => sicoobOrderService.getOrderById(requireOrderId(id)),
    enabled: !!id,
  });
};

export const useSicoobOrderDetails = (orderId?: string) => {
  const itemsQuery = useQuery({
    queryKey: ["sicoob_order_items", orderId],
    queryFn: () => sicoobOrderService.getOrderItems(requireOrderId(orderId)),
    enabled: !!orderId,
  });

  const logsQuery = useQuery({
    queryKey: ["sicoob_order_item_logs", orderId],
    queryFn: () => sicoobOrderService.getItemLogs(requireOrderId(orderId)),
    enabled: !!orderId,
  });

  return {
    items: itemsQuery.data,
    isLoadingItems: itemsQuery.isLoading,
    logs: logsQuery.data,
    isLoadingLogs: logsQuery.isLoading,
  };
};

export const useUpdateSicoobOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, status, currentStatus, observations }: { 
      orderId: string, 
      status: string, 
      currentStatus?: string,
      observations?: string
    }) => {
      return sicoobOrderService.updateOrderStatus(orderId, status, currentStatus, observations);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sicoob_order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders_list"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_history", variables.orderId] });
      toast.success("Status do pedido atualizado com sucesso!");
    },
    onError: (err: unknown) => {
      toast.error("Erro ao atualizar status: " + (err instanceof Error ? err.message : String(err)));
    }
  });
};
