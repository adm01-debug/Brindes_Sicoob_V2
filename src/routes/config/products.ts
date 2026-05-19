import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

/**
 * Rotas de Produtos - Portal Sicoob
 * Refatoradas para excelência técnica 10/10
 */
export const productRoutes = [
  defineRoute({ 
    path: "/produto/:id", 
    component: lazyWithRetry(() => import("@/pages/ProductDetail")) 
  }),
  defineRoute({ 
    path: "/novidades", 
    component: lazyWithRetry(() => import("@/pages/NoveltiesPage")) 
  }),
  defineRoute({ 
    path: "/filtros", 
    component: lazyWithRetry(() => import("@/pages/FiltersPage")) 
  }),
  defineRoute({ 
    path: "/colecoes", 
    component: lazyWithRetry(() => import("@/pages/CollectionsPage")) 
  }),
  defineRoute({ 
    path: "/colecoes/:id", 
    component: lazyWithRetry(() => import("@/pages/CollectionDetailPage")) 
  }),
  defineRoute({ 
    path: "/estoque", 
    component: lazyWithRetry(() => import("@/pages/StockDashboardPage")) 
  }),
  defineRoute({ 
    path: "/favoritos", 
    component: lazyWithRetry(() => import("@/pages/FavoritesPage")) 
  }),
  defineRoute({ 
    path: "/comparar", 
    component: lazyWithRetry(() => import("@/pages/ComparePage")) 
  }),
  defineRoute({ 
    path: "/reposicao", 
    component: lazyWithRetry(() => import("@/pages/ReplenishmentsPage")) 
  }),
] as const;
