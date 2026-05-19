import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OrderService } from "@/services/OrderService";
import { toast } from "sonner";

export const useOrderLogistics = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { data: logistics, isLoading } = useQuery({
    queryKey: ["order-logistics", orderId],
    queryFn: () => OrderService.getLogistics(orderId!),
    enabled: !!orderId,
  });

  const updateLogistics = useMutation({
    mutationFn: (values: any) => OrderService.upsertLogistics(orderId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-logistics", orderId] });
      queryClient.invalidateQueries({ queryKey: ["logistics-tracking", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-audit", orderId] });
      toast.success("Logística atualizada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar logística: " + error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return { logistics, isLoading, updateLogistics };
};
