import { describe, it, expect } from 'vitest';
import { sicoobRoutes } from '../../src/routes/config/sicoob';
import { toolRoutes } from '../../src/routes/config/tools';
import { RBAC_ROUTES } from '../../src/lib/rbac/route-matrix';

describe('SICOOB RBAC Routes Integrity', () => {
  it('should contain all matrix-mandated routes', () => {
    const paths = sicoobRoutes.map(r => r.path);
    expect(paths).toContain('/pa/verba');
    expect(paths).toContain('/dashboard-pa');
    expect(paths).toContain('/gestor');
    expect(paths).toContain('/vendedor/dashboard');
  });

  it('registra a instalação do PWA como rota autenticada', () => {
    expect(toolRoutes.map(route => route.path)).toContain('/instalar');
    expect(RBAC_ROUTES).toContainEqual(expect.objectContaining({
      path: '/instalar',
      guard: 'ProtectedRoute',
      role: 'authenticated',
    }));
  });
});
