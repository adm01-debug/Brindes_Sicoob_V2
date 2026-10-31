import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, inFilter, listOrders } = vi.hoisted(() => ({
  from: vi.fn(),
  inFilter: vi.fn(),
  listOrders: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));
vi.mock('@/services/sicoob/orderService', () => ({ sicoobOrderService: { listOrders } }));

import { listSicoobLogisticsTracking } from '@/services/sicoob/logisticsReportService';

describe('listSicoobLogisticsTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReturnValue({ select: vi.fn(() => ({ in: inFilter })) });
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
    inFilter.mockResolvedValue({
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
  });

  it('propaga falhas da fonte de remessas para a tela exibir estado de erro', async () => {
    listOrders.mockResolvedValue({
      orders: [{ id: 'order-1', status: 'in_transit', order_number: 'PED-1' }],
      total: 1,
    });
    const failure = new Error('banco indisponível');
    inFilter.mockResolvedValue({ data: null, error: failure });

    await expect(listSicoobLogisticsTracking()).rejects.toBe(failure);
  });

  it('percorre todas as páginas de pedidos logísticos antes de montar o rastreamento', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => ({
      id: `order-${index}`, status: 'in_transit', order_number: `PED-${index}`,
    }));
    listOrders
      .mockResolvedValueOnce({ orders: firstPage, total: 201 })
      .mockResolvedValueOnce({ orders: [{ id: 'order-200', status: 'delivered', order_number: 'PED-200' }], total: 201 });
    inFilter.mockResolvedValue({ data: [], error: null });

    const tracking = await listSicoobLogisticsTracking();

    expect(tracking).toHaveLength(201);
    expect(listOrders).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1, pageSize: 200 }));
    expect(listOrders).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2, pageSize: 200 }));
  });
});
