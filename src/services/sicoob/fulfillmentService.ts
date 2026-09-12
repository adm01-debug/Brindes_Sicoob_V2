import { supabase } from '@/integrations/supabase/client';
import type { OrderStatus, SicoobOrderShipment } from '@/types/sicoob/orders';

type ShipmentResponse = { data: unknown; error: Error | null };
type ShipmentRpc = (name: string, args: Record<string, unknown>) => Promise<ShipmentResponse>;

const shipmentRpc = supabase.rpc as unknown as ShipmentRpc;

export interface UpdateSicoobShipmentInput {
  orderId: string;
  expectedOrderStatus: OrderStatus;
  carrierName?: string;
  trackingCode?: string;
  estimatedDelivery?: string;
  deliveryPhotoPath?: string;
}

function parseShipment(data: unknown): SicoobOrderShipment | null {
  if (!data || typeof data !== 'object') return null;
  return data as SicoobOrderShipment;
}

/** Chama funções transacionais Sicoob, sem tocar nas tabelas legadas de pedidos. */
export const sicoobFulfillmentService = {
  async getShipment(orderId: string): Promise<SicoobOrderShipment | null> {
    const { data, error } = await shipmentRpc('get_sicoob_order_shipment', { p_order_id: orderId });
    if (error) throw error;
    return parseShipment(data);
  },

  async updateShipment(input: UpdateSicoobShipmentInput): Promise<SicoobOrderShipment> {
    const { data, error } = await shipmentRpc('upsert_sicoob_order_shipment', {
      p_order_id: input.orderId,
      p_expected_order_status: input.expectedOrderStatus,
      p_carrier_name: input.carrierName ?? null,
      p_tracking_code: input.trackingCode ?? null,
      p_estimated_delivery: input.estimatedDelivery ?? null,
      p_delivery_photo_path: input.deliveryPhotoPath ?? null,
    });
    if (error) throw error;
    const shipment = parseShipment(data);
    if (!shipment) throw new Error('A logística não retornou um registro válido.');
    return shipment;
  },
};
