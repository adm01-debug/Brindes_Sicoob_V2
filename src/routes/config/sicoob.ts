import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

import { sicoobRbacRoutes } from "./sicoob-rbac";

export const sicoobRoutes = [
  ...sicoobRbacRoutes,
  defineRoute({ path: "/sicoob/pedidos", component: lazyWithRetry(() => import("@/pages/sicoob/orders/OrdersPage")) }),
  defineRoute({ path: "/sicoob/pedidos/kanban", component: lazyWithRetry(() => import("@/pages/sicoob/orders/OrdersKanbanPage")) }),
  defineRoute({ path: "/sicoob/pedidos/:id", component: lazyWithRetry(() => import("@/pages/sicoob/orders/OrderDetailPage")) }),
  defineRoute({ path: "/sicoob/logistica", component: lazyWithRetry(() => import("@/pages/sicoob/LogisticsReportPage")) }),
  defineRoute({ path: "/sicoob/vendas", component: lazyWithRetry(() => import("@/pages/sicoob/orders/SellerPanelPage")) }),
] as const;
