import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

/**
 * Rotas de Produtos - Portal Sicoob
 * Refatoradas para excelência técnica 10/10
 */
export const productRoutes = [
  defineRoute({
    path: "/produtos",
    component: lazyWithRetry(() => import("@/pages/FiltersPage"))
  }),
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
  defineRoute({
    path: "/meus-kits",
    component: lazyWithRetry(() => import("@/pages/KitLibraryPage"))
  }),
  defineRoute({
    path: "/mockups/historico",
    component: lazyWithRetry(() => import("@/pages/MockupHistoryPage"))
  }),
  defineRoute({
    path: "/tendencias",
    component: lazyWithRetry(() => import("@/pages/TrendsPage"))
  }),
  defineRoute({
    path: "/inteligencia-comercial",
    component: lazyWithRetry(() => import("@/pages/CommercialIntelligencePage"))
  }),
  defineRoute({
    path: "/ferramentas/bi",
    component: lazyWithRetry(() => import("@/pages/BusinessIntelligencePage"))
  }),
  defineRoute({
    path: "/ferramentas/bi/comparar",
    component: lazyWithRetry(() => import("@/pages/ClientComparatorPage"))
  }),
  defineRoute({
    path: "/dropbox",
    component: lazyWithRetry(() => import("@/pages/DropboxBrowserPage"))
  }),
] as const;
