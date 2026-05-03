import { lazyWithRetry } from "@/lib/lazyWithRetry";

export const productRoutes = [
  { path: "/produtos", component: lazyWithRetry(() => import("@/pages/FiltersPage")) },
  { path: "/filtros", component: lazyWithRetry(() => import("@/pages/FiltersPage")) },
  { path: "/produto/:id", component: lazyWithRetry(() => import("@/pages/ProductDetail")) },
  { path: "/novidades", component: lazyWithRetry(() => import("@/pages/NoveltiesPage")) },
  { path: "/reposicao", component: lazyWithRetry(() => import("@/pages/ReplenishmentsPage")) },
  { path: "/favoritos", component: lazyWithRetry(() => import("@/pages/FavoritesPage")) },
  { path: "/carrinhos", component: lazyWithRetry(() => import("@/pages/SellerCartsPage")) },
  { path: "/carrinhos/:cartId", component: lazyWithRetry(() => import("@/pages/SellerCartsPage")) },
  { path: "/comparar", component: lazyWithRetry(() => import("@/pages/ComparePage")) },
  { path: "/colecoes", component: lazyWithRetry(() => import("@/pages/CollectionsPage")) },
  { path: "/colecoes/:id", component: lazyWithRetry(() => import("@/pages/CollectionDetailPage")) },
];
