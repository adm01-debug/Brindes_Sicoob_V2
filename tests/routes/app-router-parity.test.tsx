/**
 * Inventário de rotas — nenhuma rota pode sumir em silêncio.
 *
 * Recuperado de `tests/routes/app-router-parity.test.tsx` da branch de produção
 * `claude/fix-prod-cors-audit-261118-1034` (PRs #308/#318, fechadas). O original
 * importava `@/routes/app-router`, um roteador monolítico que a `main` substituiu
 * por módulos em `src/routes/config/`: o arquivo não roda aqui como está.
 *
 * O que ele garantia, porém, continua valendo e foi portado: a lista de caminhos
 * que o portal publica é conferida contra o que os módulos realmente exportam.
 * Conferência feita em 19/11/2026 antes de escrever este teste: das rotas que o
 * roteador antigo declarava, **nenhuma** está ausente da `main`. O que mudou foi
 * o mecanismo, não o inventário.
 *
 * O que este teste NÃO cobre, e o original cobria: o aninhamento de portões
 * (`protected`, `admin`, `sicoob`, `dev`). Na `main` esse aninhamento está em
 * JSX dentro de `App.tsx`, não numa árvore de `RouteObject` inspecionável. Quem
 * cobre papel por rota hoje é `tests/admin/admin-route-contract.test.ts` e
 * `tests/rls/dev-routes-guarded.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { publicRoutes } from '@/routes/config/public';
import { productRoutes } from '@/routes/config/products';
import { quoteRoutes } from '@/routes/config/quotes';
import { toolRoutes } from '@/routes/config/tools';
import { adminRoutes } from '@/routes/config/admin';
import { sicoobRoutes } from '@/routes/config/sicoob';
import { devRoutes } from '@/routes/config/dev';

/** Caminhos sem autenticação, como o roteador antigo os declarava. */
const rotasPublicas = [
  '/login',
  '/reset-password',
  '/convite/:token',
  '/verificacao',
  '/sso/callback',
  '/colecao-publica/:token',
  '/approve/:token',
  '/proposta/:token',
  '/kit/:token',
  '/comparar-publica/:token',
  '/dossie/:token',
  '/lista-publica/:token',
  '/public/colecao/:token',
  '/public/orcamento/:token/aprovacao',
  '/public/kit/:token',
  '/public/comparativo/:token',
  '/public/dossie/:token',
  '/public/favoritos/:token',
  '/configuracoes',
  '/perfil',
  '/403',
  '*'
] as const;

/** Caminhos atrás de sessão. */
const rotasProtegidas = [
  '/',
  '/dashboard',
  '/produtos',
  '/produto/:id',
  '/novidades',
  '/filtros',
  '/colecoes',
  '/colecoes/:id',
  '/estoque',
  '/favoritos',
  '/comparar',
  '/reposicao',
  '/meus-kits',
  '/mockups/historico',
  '/tendencias',
  '/inteligencia-comercial',
  '/ferramentas/bi',
  '/ferramentas/bi/comparar',
  '/dropbox',
  '/orcamentos',
  '/orcamentos/dashboard',
  '/orcamentos/lista',
  '/orcamentos/kanban',
  '/orcamentos/templates',
  '/orcamentos/novo',
  '/meus-orcamentos',
  '/orcamentos/:id',
  '/orcamentos/:id/editar',
  '/orcamentos/:id/visualizar',
  '/carrinhos',
  '/carrinhos/novo',
  '/carrinhos/:cartId',
  '/ajuda',
  '/mockup-generator',
  '/magic-up',
  '/match',
  '/montar-kit',
  '/simulador',
  '/simulador-precos',
  '/busca-preco',
  '/admin/temas',
  '/pedidos',
  '/pedidos/:id',
  '/notificacoes',
  '/pedidos/:id/auditoria'
] as const;

/** Caminhos de administração. */
const rotasAdmin = [
  '/admin/aprovacoes-desconto',
  '/admin/sicoob',
  '/admin/sicoob/notificacoes',
  '/admin/usuarios',
  '/admin/cadastros',
  '/admin/categories',
  '/admin/singulares',
  '/admin/pas',
  '/admin/cooperativas',
  '/admin/cms',
  '/admin/newsletter',
  '/admin/campanhas',
  '/admin/verbas',
  '/admin/limites-desconto',
  '/admin/permissoes',
  '/admin/roles',
  '/admin/role-permissoes',
  '/admin/video-variantes',
  '/admin/kit-templates',
  '/admin/design-system/colors',
  '/admin/saude-testes',
  '/clientes',
  '/clientes/:id'
] as const;

/** Caminhos do portal Sicoob. */
const rotasSicoob = [
  '/pa/verba',
  '/dashboard-pa',
  '/gestor/compras',
  '/gestor',
  '/gestor/agregados',
  '/gestor/convites',
  '/gestor/aprovacoes',
  '/gestor/delegacoes',
  '/gestor/auditoria',
  '/vendedor/dashboard',
  '/relatorios/sicoob',
  '/kpis/sicoob',
  '/gestor/orcamentos',
  '/sicoob/pedidos',
  '/sicoob/pedidos/kanban',
  '/sicoob/pedidos/:id',
  '/sicoob/logistica',
  '/sicoob/vendas'
] as const;

/** Caminhos de diagnóstico e manutenção. */
const rotasDev = [
  '/sicoob/qa/preflight',
  '/admin/telemetria',
  '/admin/performance',
  '/admin/seguranca',
  '/admin/seguranca-acesso',
  '/admin/conexoes',
  '/admin/conexoes/status',
  '/admin/external-db',
  '/external-db-test',
  '/admin/prompts-ia',
  '/admin/workflows',
  '/admin/rbac-rotas',
  '/admin/qa/preflight',
  '/admin/qa/release-evidences',
  '/admin/seguranca/rls',
  '/admin/seguranca/chaves',
  '/admin/seguranca/migracao-papeis',
  '/admin/validade-precos',
  '/admin/rate-limit',
  '/admin/login-attempts',
  '/admin/consumo-ia',
  '/admin/rls-denials',
  '/admin/auditoria-propriedade',
  '/status'
] as const;

/** Os módulos declaram `path` em cada entrada; é esse o inventário publicado. */
function caminhosDe(rotas: ReadonlyArray<{ path?: string }>): string[] {
  return rotas.map((rota) => rota.path).filter((path): path is string => Boolean(path));
}

const inventario = new Set([
  ...caminhosDe(publicRoutes),
  ...caminhosDe(productRoutes),
  ...caminhosDe(quoteRoutes),
  ...caminhosDe(toolRoutes),
  ...caminhosDe(adminRoutes),
  ...caminhosDe(sicoobRoutes),
  ...caminhosDe(devRoutes),
]);

/**
 * Parte do roteador fica fora dos módulos: o shell autenticado declara `/`,
 * `/dashboard`, `/pedidos`, `/clientes`, `/configuracoes`, `/403` e o curinga
 * direto em `App.tsx`. São lidos do arquivo porque estão em JSX, não numa
 * estrutura importável — ler o texto é o preço de não deixar essas rotas fora
 * da conferência.
 */
function caminhosDeclaradosEmJsx(): string[] {
  const fontes = ['src/App.tsx', 'src/routes/clientRoutes.ts'];
  return fontes.flatMap((arquivo) => {
    const conteudo = readFileSync(arquivo, 'utf8');
    const emJsx = [...conteudo.matchAll(/path="([^"]+)"/g)].map((m) => m[1] ?? '');
    const emConstante = [...conteudo.matchAll(/["'](\/[^"']*)["']/g)].map((m) => m[1] ?? '');
    return [...emJsx, ...emConstante].filter(Boolean);
  });
}

const declaradasEmApp = new Set([...caminhosDeclaradosEmJsx(), '*']);

describe('inventário de rotas do portal', () => {
  it.each([
    ['públicas', rotasPublicas],
    ['protegidas', rotasProtegidas],
    ['admin', rotasAdmin],
    ['Sicoob', rotasSicoob],
    ['dev', rotasDev],
  ])('mantém as rotas %s que o roteador anterior publicava', (_grupo, caminhos) => {
    const ausentes = caminhos.filter(
      (path) => !inventario.has(path) && !declaradasEmApp.has(path),
    );
    expect(ausentes).toEqual([]);
  });

  it('não deixa rota de módulo sem caminho declarado', () => {
    const modulos = [
      publicRoutes, productRoutes, quoteRoutes, toolRoutes,
      adminRoutes, sicoobRoutes, devRoutes,
    ];
    const semPath = modulos.flat().filter((rota) => !(rota as { path?: string }).path);
    expect(semPath).toEqual([]);
  });
});
