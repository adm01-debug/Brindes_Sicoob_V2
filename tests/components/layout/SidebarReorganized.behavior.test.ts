import { describe, expect, it } from 'vitest';
import { navGroups, withItemBadge } from '@/components/layout/SidebarReorganized';

describe('navegação lateral por papel', () => {
  it('expõe os painéis de gestão aos papéis Sicoob autorizados', () => {
    const portal = navGroups.find((group) => group.id === 'sicoob-portal');
    const quotes = navGroups.find((group) => group.id === 'quotes');
    const manager = portal?.items.find((item) => item.href === '/gestor');
    const approvals = quotes?.items.find((item) => item.href === '/gestor/aprovacoes');

    expect(manager?.adminOnly).not.toBe(true);
    expect(manager?.allowedRoles).toContain('gestor_compras');
    expect(approvals?.allowedRoles).toContain('gerente_pa');
  });

  it('aplica contadores também a itens filhos', () => {
    const admin = navGroups.find((group) => group.id === 'admin');
    expect(admin).toBeDefined();

    const enriched = withItemBadge(admin!, '/admin/usuarios?tab=discounts', 4);
    const users = enriched.items.find((item) => item.href === '/admin/usuarios');
    const discounts = users?.children?.find(
      (item) => item.href === '/admin/usuarios?tab=discounts',
    );

    expect(discounts?.badge).toBe(4);
  });
});
