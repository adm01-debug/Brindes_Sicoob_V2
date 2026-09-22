import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc },
}));

import { sicoobFulfillmentService } from '@/services/sicoob/fulfillmentService';

describe('sicoobFulfillmentService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia estado esperado e caminho privado ao RPC transacional', async () => {
    rpc.mockResolvedValue({
      data: { id: 'ship-1', order_id: 'order-1', status: 'delivered' },
      error: null,
    });

    await sicoobFulfillmentService.updateShipment({
      orderId: 'order-1',
      expectedOrderStatus: 'in_transit',
      deliveryPhotoPath: 'order-1/delivery/proof.jpg',
    });

    expect(rpc).toHaveBeenCalledWith('upsert_sicoob_order_shipment', {
      p_order_id: 'order-1',
      p_expected_order_status: 'in_transit',
      p_carrier_name: null,
      p_tracking_code: null,
      p_estimated_delivery: null,
      p_delivery_photo_path: 'order-1/delivery/proof.jpg',
    });
  });

  it('não trata resposta vazia como atualização bem-sucedida', async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await expect(sicoobFulfillmentService.updateShipment({
      orderId: 'order-1', expectedOrderStatus: 'in_separation', carrierName: 'Correios', trackingCode: 'AB123',
    })).rejects.toThrow(/registro válido/i);
  });

  it('consulta a remessa pelo RPC e aceita ausência de registro', async () => {
    rpc.mockResolvedValueOnce({ data: { id: 'ship-1', order_id: 'order-1' }, error: null });
    await expect(sicoobFulfillmentService.getShipment('order-1')).resolves.toMatchObject({ id: 'ship-1' });
    expect(rpc).toHaveBeenLastCalledWith('get_sicoob_order_shipment', { p_order_id: 'order-1' });

    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(sicoobFulfillmentService.getShipment('order-2')).resolves.toBeNull();
  });

  it('propaga erros das RPCs de consulta e atualização', async () => {
    const failure = new Error('falha transacional');
    rpc.mockResolvedValue({ data: null, error: failure });

    await expect(sicoobFulfillmentService.getShipment('order-1')).rejects.toBe(failure);
    await expect(sicoobFulfillmentService.updateShipment({
      orderId: 'order-1', expectedOrderStatus: 'in_transit', deliveryPhotoPath: 'proof.jpg',
    })).rejects.toBe(failure);
  });
});
