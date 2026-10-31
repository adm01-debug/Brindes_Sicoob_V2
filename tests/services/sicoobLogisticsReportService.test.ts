import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, inFilter, orderShipments, listOrders } = vi.hoisted(() => ({
  from: vi.fn(),
  inFilter: vi.fn(),
  orderShipments: vi.fn(),
  listOrders: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));
vi.mock('@/services/sicoob/orderService', () => ({ sicoobOrderService: { listOrders } }));

import { listSicoobLogisticsTracking } from '@/services/sicoob/logisticsReportService';

describe('listSicoobLogisticsTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReturnValue({ select: vi.fn(() => ({ in: inFilter })) });
    inFilter.mockReturnValue({ order: orderShipments });
  });

  it('não consulta remessas quando não há pedido no fluxo logístico', async () => {
    listOrders.mockResolvedValue({
      orders: [{ id: 'order-1', status: 'confirmed', order_number: 'PED-1' }],
      total: 1,
    });

    await expect(listSicoobLogisticsTracking()).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
    expect(listOrders).toHaveBeenCalledWith(expect.objectContaining({ statuses: expect.any(Array), page: 1, pageSize: 200 }));
  });

  it('combina pedidos e remessas canônicas sem criar dados de demonstração', async () => {
    listOrders.mockResolvedValue({
      orders: [
        { id: 'order-1', status: 'in_transit', order_number: 'PED-1', pa: { nome: 'PA Centro' } },
        { id: 'order-2', status: 'in_separation', order_number: 'PED-2', pa_id: 'pa-2' },
      ],
      total: 2,
    });
    orderShipments.mockResolvedValue({
      data: [{
        id: 'shipment-1', order_id: 'order-1', carrier_name: 'Transportadora Sicoob',
        estimated_delivery: '2026-09-30', status: 'in_transit', delivery_photo_path: null,
      }],
      error: null,
    });

    await expect(listSicoobLogisticsTracking()).resolves.toEqual([
      expect.objectContaining({
        id: 'shipment-1', orderId: 'order-1', orderNumber: 'PED-1', destination: 'PA Centro',
        carrierName: 'Transportadora Sicoob', status: 'in_transit', hasDeliveryProof: false,
      }),
      expect.objectContaining({
        id: 'order-2', orderId: 'order-2', destination: 'pa-2', status: 'pending', hasDeliveryProof: false,
      }),
    ]);
    expect(inFilter).toHaveBeenCalledWith('order_id', ['order-1', 'order-2']);
    expect(orderShipments).toHaveBeenCalledWith('order_id', { ascending: true });
  });

  it('propaga falhas da fonte de remessas para a tela exibir estado de erro', async () => {
    listOrders.mockResolvedValue({
      orders: [{ id: 'order-1', status: 'in_transit', order_number: 'PED-1' }],
      total: 1,
    });
    const failure = new Error('banco indisponível');
    orderShipments.mockResolvedValue({ data: null, error: failure });

    await expect(listSicoobLogisticsTracking()).rejects.toBe(failure);
  });

  it('percorre todas as páginas de pedidos logísticos antes de montar o rastreamento', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => ({
      id: `order-${index}`, status: 'in_transit', order_number: `PED-${index}`,
    }));
    listOrders
      .mockResolvedValueOnce({ orders: firstPage, total: 201 })
      .mockResolvedValueOnce({ orders: [{ id: 'order-200', status: 'delivered', order_number: 'PED-200' }], total: 201 });
    orderShipments.mockResolvedValue({ data: [], error: null });

    const tracking = await listSicoobLogisticsTracking();

    expect(tracking).toHaveLength(201);
    expect(listOrders).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1, pageSize: 200 }));
    expect(listOrders).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2, pageSize: 200 }));
  });

  it('consulta remessas em lotes determinísticos quando há mais de mil pedidos', async () => {
    const orders = Array.from({ length: 1001 }, (_, index) => ({
      id: `order-${index}`,
      status: 'in_transit',
      order_number: `PED-${index}`,
    }));
    for (let offset = 0; offset < orders.length; offset += 200) {
      listOrders.mockResolvedValueOnce({ orders: orders.slice(offset, offset + 200), total: orders.length });
    }
    orderShipments.mockResolvedValue({ data: [], error: null });

    const tracking = await listSicoobLogisticsTracking();

    expect(tracking).toHaveLength(1001);
    expect(inFilter).toHaveBeenCalledTimes(6);
    expect(inFilter).toHaveBeenNthCalledWith(1, 'order_id', orders.slice(0, 200).map(({ id }) => id));
    expect(inFilter).toHaveBeenNthCalledWith(6, 'order_id', ['order-1000']);
    expect(orderShipments).toHaveBeenCalledTimes(6);
    expect(orderShipments).toHaveBeenNthCalledWith(6, 'order_id', { ascending: true });
  });

  it('interrompe a consolidação se qualquer lote de remessas falhar', async () => {
    const orders = Array.from({ length: 201 }, (_, index) => ({
      id: `order-${index}`,
      status: 'in_transit',
      order_number: `PED-${index}`,
    }));
    listOrders.mockResolvedValueOnce({ orders, total: orders.length });
    const failure = new Error('falha ao consultar o segundo lote');
    orderShipments
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: null, error: failure });

    await expect(listSicoobLogisticsTracking()).rejects.toBe(failure);
    expect(inFilter).toHaveBeenCalledTimes(2);
  });
});
