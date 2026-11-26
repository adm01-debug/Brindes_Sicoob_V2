import { describe, it, expect } from 'vitest';
import { sicoobRoutes } from '../../src/routes/config/sicoob';
import { toolRoutes } from '../../src/routes/config/tools';
import { productRoutes } from '../../src/routes/config/products';
import { RBAC_ROUTES } from '../../src/lib/rbac/route-matrix';
import { adminRoutes } from '../../src/routes/config/admin';
import { navGroups } from '../../src/components/layout/SidebarReorganized';

describe('SICOOB RBAC Routes Integrity', () => {
  it('should contain all matrix-mandated routes', () => {
    const paths = sicoobRoutes.map(r => r.path);
    expect(paths).toContain('/pa/verba');
    expect(paths).toContain('/dashboard-pa');
    expect(paths).toContain('/gestor');
    expect(paths).toContain('/vendedor/dashboard');
  });

  it('registra a instalação do PWA como rota autenticada', () => {
    // O item "Instalar App" do menu mobile (Header.tsx:118) navega para
    // /instalar e a página existe, mas a rota nunca foi registrada: o toque
    // caía no NotFound. Esta catraca impede a rota de se perder de novo.
    expect(toolRoutes.map((route) => route.path)).toContain('/instalar');

    const entrada = RBAC_ROUTES.find((route) => route.path === '/instalar');
    expect(entrada).toMatchObject({ guard: 'ProtectedRoute', role: 'authenticated' });
  });

  it('o cadastro de Centrais tem rota, guarda de admin e entrada no menu', () => {
    // sicoob_centrais só tinha política de leitura, e a tela de CRUD existia
    // sem rota: a Promo não conseguia cadastrar Central pelo sistema.
    expect(adminRoutes.map((route) => route.path)).toContain('/admin/centrais');

    const entrada = RBAC_ROUTES.find((route) => route.path === '/admin/centrais');
    expect(entrada).toMatchObject({ guard: 'AdminRoute', role: 'admin' });

    const itens = navGroups
      .flatMap((grupo) => grupo.items)
      .flatMap((item) => [item, ...(item.children ?? [])])
      .filter((item) => item.href === '/admin/centrais');
    expect(itens).toHaveLength(1);
  });

  it('todo destino do menu mobile tem rota registrada', () => {
    // Caso geral: item de menu apontando para caminho sem rota vira NotFound em
    // produção, como aconteceu com /instalar. Os três destinos do menu mobile
    // de Header.tsx:118 são /favoritos, /comparar e /instalar.
    const registradas = new Set<string>([
      ...toolRoutes.map((route) => route.path as string),
      ...productRoutes.map((route) => route.path as string),
      ...sicoobRoutes.map((route) => route.path as string),
    ]);

    expect(['/favoritos', '/comparar', '/instalar'].filter((d) => !registradas.has(d))).toEqual([]);
  });
});
