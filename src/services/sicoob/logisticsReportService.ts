import { supabase } from '@/integrations/supabase/client';
import { type SicoobOrder } from '@/types/sicoob/orders';
import { sicoobOrderService } from './orderService';

export type SicoobLogisticsStatus = 'pending' | 'in_transit' | 'delivered';

export interface SicoobLogisticsTracking {
  id: string;
  orderId: string;
  orderNumber: string;
  destination: string;
  carrierName: string | null;
  estimatedDelivery: string | null;
  status: SicoobLogisticsStatus;
  hasDeliveryProof: boolean;
}

const LOGISTICS_ORDER_STATUSES = new Set([
  'logistic',
  'in_separation',
  'in_transit',
  'delivered',
  'completed',
]);
const LOGISTICS_ORDER_STATUS_LIST = [...LOGISTICS_ORDER_STATUSES];
const LOGISTICS_PAGE_SIZE = 200;

function statusFromOrder(status: string): SicoobLogisticsStatus {
  if (status === 'delivered' || status === 'completed') return 'delivered';
  if (status === 'in_transit' || status === 'logistic') return 'in_transit';
  return 'pending';
}

/**
 * Consolida a visão de rastreamento a partir das fontes canônicas Sicoob.
 * A autorização continua no banco: a consulta de pedidos e a de remessas
 * obedecem às policies RLS do usuário autenticado.
 */
export async function listSicoobLogisticsTracking(): Promise<SicoobLogisticsTracking[]> {
  const logisticsOrders = await listAllLogisticsOrders();

  if (logisticsOrders.length === 0) return [];

  const orderIds = logisticsOrders.map((order) => order.id);
  const { data: shipments, error } = await supabase
    .from('sicoob_order_shipments')
    .select('id, order_id, carrier_name, estimated_delivery, status, delivery_photo_path')
    .in('order_id', orderIds);

  if (error) throw error;

  const shipmentByOrderId = new Map((shipments ?? []).map((shipment) => [shipment.order_id, shipment]));

  return logisticsOrders.map((order) => trackingFromOrder(order, shipmentByOrderId.get(order.id)));
}

async function listAllLogisticsOrders(): Promise<SicoobOrder[]> {
  const orders: SicoobOrder[] = [];
  const seenIds = new Set<string>();
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while ((page - 1) * LOGISTICS_PAGE_SIZE < total) {
    const result = await sicoobOrderService.listOrders({
      statuses: LOGISTICS_ORDER_STATUS_LIST,
      page,
      pageSize: LOGISTICS_PAGE_SIZE,
    });
    total = result.total;
    for (const order of result.orders) {
      if (LOGISTICS_ORDER_STATUSES.has(order.status) && !seenIds.has(order.id)) {
        seenIds.add(order.id);
        orders.push(order);
      }
    }
    if (result.orders.length < LOGISTICS_PAGE_SIZE) return orders;
    page += 1;
  }

  return orders;
}

function trackingFromOrder(
  order: SicoobOrder,
  shipment: {
    id: string;
    carrier_name: string | null;
    estimated_delivery: string | null;
    status: string;
    delivery_photo_path: string | null;
  } | undefined,
): SicoobLogisticsTracking {
  const shipmentStatus = shipment?.status;
  const status: SicoobLogisticsStatus = shipmentStatus === 'delivered' || shipmentStatus === 'in_transit'
    ? shipmentStatus
    : statusFromOrder(order.status);

  return {
    id: shipment?.id ?? order.id,
    orderId: order.id,
    orderNumber: order.order_number,
    destination: order.pa?.nome ?? order.pa_id ?? order.delivery_address ?? 'Destino não informado',
    carrierName: shipment?.carrier_name ?? null,
    estimatedDelivery: shipment?.estimated_delivery ?? null,
    status,
    hasDeliveryProof: Boolean(shipment?.delivery_photo_path),
  };
}
