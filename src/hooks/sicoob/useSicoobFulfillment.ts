import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sicoobFulfillmentService, type UpdateSicoobShipmentInput } from '@/services/sicoob/fulfillmentService';

export function useSicoobShipment(orderId?: string) {
  return useQuery({
    queryKey: ['sicoob_order_shipment', orderId],
    queryFn: () => sicoobFulfillmentService.getShipment(orderId!),
    enabled: Boolean(orderId),
  });
}

export function useUpdateSicoobShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSicoobShipmentInput) => sicoobFulfillmentService.updateShipment(input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['sicoob_order_shipment', input.orderId] });
      queryClient.invalidateQueries({ queryKey: ['sicoob_order', input.orderId] });
      queryClient.invalidateQueries({ queryKey: ['sicoob_orders_list'] });
    },
  });
}
