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
    const secondPage = Array.from({ length: 200 }, (_, index) => ({
      id: `order-${index + 200}`, status: 'in_transit', order_number: `PED-${index + 200}`,
    }));
    listOrders
      .mockResolvedValueOnce({ orders: firstPage, total: 401 })
      .mockResolvedValueOnce({ orders: secondPage, total: 401 })
      .mockResolvedValueOnce({ orders: [{ id: 'order-400', status: 'delivered', order_number: 'PED-400' }], total: 401 });
    inFilter.mockResolvedValue({ data: [], error: null });

    const tracking = await listSicoobLogisticsTracking();

    expect(tracking).toHaveLength(401);
    expect(listOrders).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1, pageSize: 200 }));
    expect(listOrders).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2, pageSize: 200 }));
    expect(listOrders).toHaveBeenNthCalledWith(3, expect.objectContaining({ page: 3, pageSize: 200 }));
    expect(inFilter).toHaveBeenCalledTimes(5);
    expect(inFilter).toHaveBeenNthCalledWith(1, 'order_id', Array.from({ length: 100 }, (_, index) => `order-${index}`));
    expect(inFilter).toHaveBeenNthCalledWith(2, 'order_id', Array.from({ length: 100 }, (_, index) => `order-${index + 100}`));
    expect(inFilter).toHaveBeenNthCalledWith(3, 'order_id', Array.from({ length: 100 }, (_, index) => `order-${index + 200}`));
    expect(inFilter).toHaveBeenNthCalledWith(4, 'order_id', Array.from({ length: 100 }, (_, index) => `order-${index + 300}`));
    expect(inFilter).toHaveBeenNthCalledWith(5, 'order_id', ['order-400']);
  });
});
