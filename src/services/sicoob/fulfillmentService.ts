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

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function hasShipmentIdentity(shipment: Record<string, unknown>): boolean {
  return ['id', 'order_id', 'created_at', 'updated_at'].every((field) => typeof shipment[field] === 'string');
}

function hasShipmentDetails(shipment: Record<string, unknown>): boolean {
  return ['carrier_name', 'tracking_code', 'estimated_delivery', 'actual_delivery_at', 'delivery_photo_path']
    .every((field) => isNullableString(shipment[field]));
}

function parseShipment(data: unknown): SicoobOrderShipment | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const shipment = data as Record<string, unknown>;
  if (
    !hasShipmentIdentity(shipment) ||
    !['pending', 'in_transit', 'delivered'].includes(String(shipment.status)) ||
    !hasShipmentDetails(shipment)
  ) return null;
  return shipment as unknown as SicoobOrderShipment;
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
