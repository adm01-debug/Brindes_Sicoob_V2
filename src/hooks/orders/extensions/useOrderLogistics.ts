import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrderService } from "@/services/OrderService";
import { toast } from "sonner";
import type { OrderLogistics } from "@/types/orders";
import { requireOrderId } from "@/hooks/orders/require-order-id";

export const useOrderLogistics = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { data: logistics, isLoading } = useQuery({
    queryKey: ["order-logistics", orderId],
    queryFn: () => OrderService.getLogistics(requireOrderId(orderId)),
    enabled: !!orderId,
  });

  const updateLogistics = useMutation({
    mutationFn: (values: Partial<OrderLogistics>) => OrderService.upsertLogistics(requireOrderId(orderId), values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-logistics", orderId] });
      queryClient.invalidateQueries({ queryKey: ["logistics-tracking", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-audit", orderId] });
      toast.success("Logística atualizada com sucesso");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao atualizar logística: " + (error instanceof Error ? error.message : String(error)));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return { logistics, isLoading, updateLogistics };
};
