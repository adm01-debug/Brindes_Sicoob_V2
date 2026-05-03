import { describe, it, expect } from 'vitest';
import { sicoobRoutes } from '../../src/routes/config/sicoob';

describe('SICOOB RBAC Routes Integrity', () => {
  it('should contain all matrix-mandated routes', () => {
    const paths = sicoobRoutes.map(r => r.path);
    expect(paths).toContain('/pa/verba');
    expect(paths).toContain('/dashboard-pa');
    expect(paths).toContain('/gestor');
    expect(paths).toContain('/vendedor/dashboard');
  });
});
