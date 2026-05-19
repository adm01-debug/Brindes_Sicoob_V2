import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

/**
 * Rotas de Orçamentos e Vendas - Portal Sicoob
 * Refatoradas para excelência técnica 10/10
 */
export const quoteRoutes = [
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
    component: lazyWithRetry(() => import("@/pages/QuoteDetailPage")) 
  }),
  defineRoute({ 
    path: "/orcamentos/:id/visualizar", 
    component: lazyWithRetry(() => import("@/pages/QuoteViewPage")) 
  }),

  defineRoute({ 
    path: "/gestor/orcamentos", 
    component: lazyWithRetry(() => import("@/pages/GestorOrcamentos")) 
  }),
  defineRoute({ 
    path: "/carrinhos", 
    component: lazyWithRetry(() => import("@/pages/SellerCartsPage")) 
  }),
] as const;
