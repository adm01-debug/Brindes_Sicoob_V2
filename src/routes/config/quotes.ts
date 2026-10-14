import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

/**
 * Rotas de Orçamentos e Vendas - Portal Sicoob
 * Refatoradas para excelência técnica 10/10
 */
export const quoteRoutes = [
  defineRoute({
    path: "/orcamentos",
    component: lazyWithRetry(() => import("@/pages/QuotesListPage"))
  }),
  defineRoute({
    path: "/orcamentos/dashboard",
    component: lazyWithRetry(() => import("@/pages/QuotesDashboardPage"))
  }),
  defineRoute({
    path: "/orcamentos/lista",
    component: lazyWithRetry(() => import("@/pages/QuotesListPage"))
  }),
  defineRoute({
    path: "/orcamentos/kanban",
    component: lazyWithRetry(() => import("@/pages/QuotesKanbanPage"))
  }),
  defineRoute({
    path: "/orcamentos/templates",
    component: lazyWithRetry(() => import("@/pages/QuoteTemplatesPage"))
  }),
  defineRoute({ 
    path: "/orcamentos/novo", 
    component: lazyWithRetry(() => import("@/pages/QuoteBuilderPage")) 
  }),
  defineRoute({ 
    path: "/meus-orcamentos", 
    component: lazyWithRetry(() => import("@/pages/MeusOrcamentos")) 
  }),
  defineRoute({ 
    path: "/orcamentos/:id", 
    component: lazyWithRetry(() => import("@/pages/QuoteViewPage"))
  }),
  defineRoute({
    path: "/orcamentos/:id/editar",
    component: lazyWithRetry(() => import("@/pages/QuoteBuilderPage"))
  }),
  defineRoute({ 
    path: "/orcamentos/:id/visualizar", 
    component: lazyWithRetry(() => import("@/pages/QuoteViewPage")) 
  }),

  defineRoute({ 
    path: "/carrinhos", 
    component: lazyWithRetry(() => import("@/pages/SellerCartsPage")) 
  }),
  defineRoute({
    path: "/carrinhos/novo",
    component: lazyWithRetry(() => import("@/pages/SellerCartsPage"))
  }),
  defineRoute({
    path: "/carrinhos/:cartId",
    component: lazyWithRetry(() => import("@/pages/SellerCartsPage"))
  }),
] as const;
