import type { RouteObject } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { buildAppRoutes } from '@/routes/app-router';

const publicPaths = [
  '/login', '/reset-password', '/convite/:token', '/verificacao', '/sso/callback',
  '/colecao-publica/:token', '/approve/:token', '/proposta/:token', '/kit/:token',
  '/comparar-publica/:token', '/dossie/:token', '/lista-publica/:token',
  '/public/colecao/:token', '/public/orcamento/:token/aprovacao', '/public/kit/:token',
  '/public/comparativo/:token', '/public/dossie/:token', '/public/favoritos/:token',
  '/configuracoes', '/perfil', '/403', '*',
];

const protectedPaths = [
  '/', '/dashboard', '/produtos', '/produto/:id', '/novidades', '/filtros', '/colecoes',
  '/colecoes/:id', '/estoque', '/favoritos', '/comparar', '/reposicao', '/meus-kits',
  '/mockups/historico', '/tendencias', '/inteligencia-comercial', '/ferramentas/bi',
  '/ferramentas/bi/comparar', '/dropbox', '/orcamentos', '/orcamentos/dashboard',
  '/orcamentos/lista', '/orcamentos/kanban', '/orcamentos/templates', '/orcamentos/novo',
  '/meus-orcamentos', '/orcamentos/:id', '/orcamentos/:id/editar',
  '/orcamentos/:id/visualizar', '/carrinhos', '/carrinhos/novo', '/carrinhos/:cartId',
  '/ajuda', '/mockup-generator', '/magic-up', '/match', '/montar-kit', '/simulador',
  '/simulador-precos', '/busca-preco', '/admin/temas', '/pedidos', '/pedidos/:id',
  '/notificacoes', '/pedidos/:id/auditoria',
];

const adminPaths = [
  '/admin/aprovacoes-desconto', '/admin/sicoob', '/admin/sicoob/notificacoes',
  '/admin/usuarios', '/admin/cadastros', '/admin/categories', '/admin/singulares',
  '/admin/pas', '/admin/cooperativas', '/admin/cms', '/admin/newsletter',
  '/admin/campanhas', '/admin/verbas', '/admin/limites-desconto', '/admin/permissoes',
  '/admin/roles', '/admin/role-permissoes', '/admin/video-variantes',
  '/admin/kit-templates', '/admin/design-system/colors', '/admin/saude-testes',
  '/clientes', '/clientes/:id',
];

const sicoobPaths = [
  '/pa/verba', '/dashboard-pa', '/gestor/compras', '/gestor', '/gestor/agregados',
  '/gestor/convites', '/gestor/aprovacoes', '/gestor/delegacoes', '/gestor/auditoria', '/vendedor/dashboard',
  '/relatorios/sicoob', '/kpis/sicoob', '/gestor/orcamentos', '/sicoob/pedidos',
  '/sicoob/pedidos/kanban', '/sicoob/pedidos/:id', '/sicoob/logistica', '/sicoob/vendas',
];

const devPaths = [
  '/sicoob/qa/preflight', '/admin/telemetria', '/admin/performance', '/admin/seguranca',
  '/admin/seguranca-acesso', '/admin/conexoes', '/admin/conexoes/status',
  '/admin/external-db', '/external-db-test', '/admin/prompts-ia', '/admin/workflows',
  '/admin/rbac-rotas', '/admin/qa/preflight', '/admin/qa/release-evidences',
  '/admin/seguranca/rls', '/admin/seguranca/chaves', '/admin/seguranca/migracao-papeis',
  '/admin/validade-precos', '/admin/rate-limit', '/admin/login-attempts',
  '/admin/consumo-ia', '/admin/rls-denials', '/admin/auditoria-propriedade', '/status',
];

interface RouteLeaf {
  path: string;
  gates: string[];
}

function flatten(routes: RouteObject[], parentGates: string[] = []): RouteLeaf[] {
  return routes.flatMap((route) => {
    const gates = route.id && ['root', 'protected', 'authenticated-shell', 'main-layout', 'admin', 'sicoob', 'dev'].includes(route.id)
      ? [...parentGates, route.id]
      : parentGates;
    if (route.children?.length) return flatten(route.children, gates);
    return route.path ? [{ path: route.path, gates }] : [];
  });
}

function expected(paths: string[], gates: string[]): RouteLeaf[] {
  return paths.map((path) => ({ path, gates }));
}

describe('paridade da árvore principal de rotas', () => {
  it('preserva todas as 132 folhas e seus gates de acesso', () => {
    const leaves = flatten(buildAppRoutes());
    const demoPaths = leaves.filter(({ path }) => path === '/loja-demo' || path === '/demonstracao');
    const coreLeaves = leaves.filter(({ path }) => path !== '/loja-demo' && path !== '/demonstracao');
    const expectedLeaves = [
      ...expected(publicPaths, ['root']),
      ...expected(protectedPaths, ['root', 'protected', 'authenticated-shell', 'main-layout']),
      ...expected(adminPaths, ['root', 'protected', 'authenticated-shell', 'main-layout', 'admin']),
      ...expected(sicoobPaths, ['root', 'protected', 'authenticated-shell', 'main-layout', 'sicoob']),
      ...expected(devPaths, ['root', 'protected', 'authenticated-shell', 'main-layout', 'dev']),
    ];

    expect(coreLeaves).toHaveLength(132);
    expect(coreLeaves).toEqual(expect.arrayContaining(expectedLeaves));
    expect(expectedLeaves).toEqual(expect.arrayContaining(coreLeaves));
    expect(demoPaths).toHaveLength([0, 2].includes(demoPaths.length) ? demoPaths.length : -1);
    for (const demo of demoPaths) expect(demo.gates).toEqual(['root']);
  });

  it('mantém admin/temas fora do AdminRoute e clientes dentro dele', () => {
    const leaves = flatten(buildAppRoutes());
    expect(leaves.find(({ path }) => path === '/admin/temas')?.gates).not.toContain('admin');
    expect(leaves.find(({ path }) => path === '/clientes')?.gates).toContain('admin');
  });
});
