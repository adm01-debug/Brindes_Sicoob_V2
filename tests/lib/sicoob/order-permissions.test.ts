import { describe, expect, it } from 'vitest';
import { canManageSicoobOrderFulfillment } from '@/lib/sicoob/order-permissions';

const order = {
  cooperative_id: 'coop-1',
  pa_id: 'pa-1',
  created_by: 'criador-1',
};

describe('canManageSicoobOrderFulfillment', () => {
  it.each(['dev', 'supervisor'])('libera o papel técnico %s', (role) => {
    expect(canManageSicoobOrderFulfillment(order, undefined, [role])).toBe(true);
  });

  it.each(['gestor_compras', 'comprador_singular'])('libera %s somente na cooperativa do pedido', (role) => {
    expect(canManageSicoobOrderFulfillment(order, { cooperativa_id: 'coop-1' }, [role])).toBe(true);
    expect(canManageSicoobOrderFulfillment(order, { cooperativa_id: 'coop-2' }, [role])).toBe(false);
    expect(canManageSicoobOrderFulfillment(order, {}, [role])).toBe(false);
  });

  it.each(['gerente_pa', 'comprador_pac'])('libera %s somente no PA do pedido', (role) => {
    expect(canManageSicoobOrderFulfillment(order, { pa_id: 'pa-1' }, [role])).toBe(true);
    expect(canManageSicoobOrderFulfillment(order, { pa_id: 'pa-2' }, [role])).toBe(false);
    expect(canManageSicoobOrderFulfillment(order, {}, [role])).toBe(false);
  });

  it('libera o criador pelo user_id ou id do perfil, sem ampliar outros atores', () => {
    expect(canManageSicoobOrderFulfillment(order, { user_id: 'criador-1' }, [])).toBe(true);
    expect(canManageSicoobOrderFulfillment(order, { id: 'criador-1' }, [])).toBe(true);
    expect(canManageSicoobOrderFulfillment(order, { user_id: 'outro' }, [])).toBe(false);
  });

  it('nega pedidos e papéis ausentes', () => {
    expect(canManageSicoobOrderFulfillment(undefined, { user_id: 'criador-1' }, ['dev'])).toBe(false);
    expect(canManageSicoobOrderFulfillment(order, { cooperativa_id: 'coop-1' }, ['vendedor'])).toBe(false);
  });
});
