import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sicoobOrderService } from "@/services/sicoob/orderService";
import { ORDER_STATUS_CONFIG, type OrderStatus } from "@/types/sicoob/orders";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export function useSicoobOrdersOptimistic() {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      orderId, 
      newStatus, 
      oldStatus, 
      observations 
    }: { 
      orderId: string; 
      newStatus: OrderStatus; 
      oldStatus: OrderStatus;
      observations?: string;
    }) => {
      return await sicoobOrderService.updateOrderStatus(orderId, newStatus, oldStatus, observations);
    },
    onMutate: async (variables) => {
      // Cancelar refetches para não sobrescrever o estado otimista
      await queryClient.cancelQueries({ queryKey: ["sicoob_orders_list"] });
      await queryClient.cancelQueries({ queryKey: ["sicoob_orders_list_kanban"] });

      // Snapshot do estado anterior
      const previousOrders = queryClient.getQueryData(["sicoob_orders_list"]);
      const previousKanbanOrders = queryClient.getQueryData(["sicoob_orders_list_kanban"]);

      // Atualizar otimistamente as queries
      const updateData = (old: any) => {
        if (!old) return old;
        return old.map((order: any) => 
          order.id === variables.orderId ? { ...order, status: variables.newStatus } : order
        );
      };

      queryClient.setQueryData(["sicoob_orders_list"], updateData);
      queryClient.setQueryData(["sicoob_orders_list_kanban"], updateData);

      return { previousOrders, previousKanbanOrders };
    },
    onError: (err, variables, context) => {
      // Rollback em caso de erro
      queryClient.setQueryData(["sicoob_orders_list"], context?.previousOrders);
      queryClient.setQueryData(["sicoob_orders_list_kanban"], context?.previousKanbanOrders);
      toast.error("Erro na sincronização", { description: (err as any).message });
    },
    onSuccess: (_, variables) => {
      const { newStatus } = variables;
      toast.success("Movimentação Concluída", {
        icon: <Zap className="h-4 w-4 text-sicoob-green" />,
        description: `Pedido agora em "${ORDER_STATUS_CONFIG[newStatus].label}".`
      });
    },
    onSettled: () => {
      // Sincronizar com o servidor no final
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders_list"] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_orders_list_kanban"] });
    }
  });

  return {
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending
  };
}
