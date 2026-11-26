import { describe, it, expect } from 'vitest';
import { sicoobRoutes } from '../../src/routes/config/sicoob';
import { toolRoutes } from '../../src/routes/config/tools';
import { productRoutes } from '../../src/routes/config/products';
import { RBAC_ROUTES } from '../../src/lib/rbac/route-matrix';
import { adminRoutes } from '../../src/routes/config/admin';
import { navGroups, hasDeclaredAccess, hasRouteAccess } from '../../src/components/layout/SidebarReorganized';
import { hasRequiredRole } from '../../src/lib/access/role-policy';
import { isAdminOnlyPath } from '../../src/lib/navigation/restricted-routes';

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

  it('nenhum item de menu leva a /403: a visibilidade segue a guarda de rota', () => {
    // O menu usava `isSupervisorOrAbove` (que inclui gestor_compras) para decidir
    // quem vê /admin/*, mas o AdminRoute exige dev|supervisor. Resultado: gestor
    // via "Centrais" e caía em 403. Esta catraca amarra a visibilidade à guarda.
    const papeis = [
      'dev', 'supervisor', 'gestor_compras', 'comprador_singular',
      'gerente_pa', 'comprador_pac', 'vendedor', 'agente',
    ];
    const todosItens = navGroups.flatMap((grupo) =>
      grupo.items.flatMap((item) => [item, ...(item.children ?? [])]),
    );
    const vazamentos: string[] = [];

    for (const papel of papeis) {
      const isDev = papel === 'dev';
      for (const item of todosItens) {
        const href = item.href ?? '';
        const visivel = hasDeclaredAccess(item, isDev, [papel]) && hasRouteAccess(href, isDev, [papel]);
        if (!visivel || !isAdminOnlyPath(href)) continue;
        if (!hasRequiredRole([papel], 'supervisor')) vazamentos.push(`${papel} -> ${href}`);
      }
    }

    expect(vazamentos).toEqual([]);

    // A visibilidade do menu tem de concordar com a guarda declarada na matriz,
    // que e o que o router aplica (AdminRoute = supervisor+, DevRoute = dev).
    // Sem isto o teste de menu poderia passar com um menu que mente sobre a guarda.
    const exigeGuarda = (guard: string | undefined, papel: string, isDev: boolean) => {
      if (guard === 'AdminRoute') return hasRequiredRole([papel], 'supervisor');
      if (guard === 'DevRoute') return isDev;
      return true;
    };
    const conferidos: string[] = [];
    for (const item of todosItens) {
      const caminho = (item.href ?? '').split('?')[0];
      if (!caminho.startsWith('/admin')) continue;
      const entrada = RBAC_ROUTES.find((route) => route.path === caminho);
      expect(entrada, `rota ${caminho} sem entrada na matriz de RBAC`).toBeDefined();
      conferidos.push(caminho);
      for (const papel of papeis) {
        const isDev = papel === 'dev';
        const visivel = hasDeclaredAccess(item, isDev, [papel])
          && hasRouteAccess(item.href ?? '', isDev, [papel]);
        if (!visivel) continue;
        expect(
          exigeGuarda(entrada?.guard, papel, isDev),
          `${papel} enxerga ${caminho}, cuja guarda e ${entrada?.guard}`,
        ).toBe(true);
      }
    }
    expect(conferidos.length).toBeGreaterThanOrEqual(10);
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
