import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

export const productRoutes = [
  defineRoute({ path: "/produtos", component: lazyWithRetry(() => import("@/pages/FiltersPage")) }),
  defineRoute({ path: "/filtros", component: lazyWithRetry(() => import("@/pages/FiltersPage")) }),
  defineRoute({ path: "/produto/:id", component: lazyWithRetry(() => import("@/pages/ProductDetail")) }),
  defineRoute({ path: "/novidades", component: lazyWithRetry(() => import("@/pages/NoveltiesPage")) }),
  defineRoute({ path: "/reposicao", component: lazyWithRetry(() => import("@/pages/ReplenishmentsPage")) }),
  defineRoute({ path: "/favoritos", component: lazyWithRetry(() => import("@/pages/FiltersPage")) }),
  defineRoute({ path: "/carrinhos", component: lazyWithRetry(() => import("@/pages/SellerCartsPage")) }),
  defineRoute({ path: "/carrinhos/:cartId", component: lazyWithRetry(() => import("@/pages/SellerCartsPage")) }),
  defineRoute({ path: "/comparar", component: lazyWithRetry(() => import("@/pages/ComparePage")) }),
  defineRoute({ path: "/colecoes", component: lazyWithRetry(() => import("@/pages/CollectionsPage")) }),
  defineRoute({ path: "/colecoes/:id", component: lazyWithRetry(() => import("@/pages/CollectionDetailPage")) }),
] as const;
