import { describe, expect, it } from 'vitest';
import { adminRoutes } from '@/routes/config/admin';

describe('contrato das rotas administrativas', () => {
  it('não publica o formulário de escrita do catálogo mestre somente leitura', () => {
    expect(adminRoutes.map((route) => route.path)).not.toContain('/admin/cadastros/produto/:id');
  });
});
