import { describe, expect, it } from 'vitest';
import { getDefaultRouteByRole } from '@/lib/auth/auth-utils';
import {
  canAccessSicoobPath,
  rolesForSicoobPath,
} from '@/lib/access/role-policy';

describe('política de navegação Sicoob', () => {
  it('envia supervisor para uma página administrativa permitida', () => {
    expect(getDefaultRouteByRole('supervisor')).toBe('/admin/usuarios');
    expect(getDefaultRouteByRole('dev')).toBe('/admin/telemetria');
  });

  it('resolve rotas dinâmicas e ignora query string', () => {
    expect(rolesForSicoobPath('/sicoob/pedidos/pedido-1')).toContain('vendedor');
    expect(rolesForSicoobPath('/gestor/aprovacoes?status=pending')).toContain('gerente_pa');
  });

  it('esconde rotas incompatíveis com o papel do usuário', () => {
    expect(canAccessSicoobPath('/dashboard-pa', ['vendedor'])).toBe(false);
    expect(canAccessSicoobPath('/vendedor/dashboard', ['gerente_pa'])).toBe(false);
    expect(canAccessSicoobPath('/gestor', ['gestor_compras'])).toBe(true);
    expect(canAccessSicoobPath('/gestor/orcamentos', ['comprador_singular'])).toBe(true);
  });

  it('não restringe rotas que não pertencem à matriz Sicoob', () => {
    expect(canAccessSicoobPath('/filtros', ['agente'])).toBe(true);
  });
});
