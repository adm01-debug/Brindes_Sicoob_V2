import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { defineRoute } from "@/lib/router-utils";

export const sicoobRoutes = [
  defineRoute({ path: "/admin/sicoob", component: lazyWithRetry(() => import("@/pages/admin/sicoob/SicoobManagementPage")) }),
  defineRoute({ path: "/sicoob/pedidos", component: lazyWithRetry(() => import("@/pages/sicoob/orders/OrdersPage")) }),
  defineRoute({ path: "/sicoob/pedidos/kanban", component: lazyWithRetry(() => import("@/pages/sicoob/orders/OrdersKanbanPage")) }),
  defineRoute({ path: "/sicoob/pedidos/:id", component: lazyWithRetry(() => import("@/pages/sicoob/orders/OrderDetailPage")) }),
  defineRoute({ path: "/sicoob/logistica", component: lazyWithRetry(() => import("@/pages/sicoob/LogisticsReportPage")) }),
  defineRoute({ path: "/sicoob/vendas", component: lazyWithRetry(() => import("@/pages/sicoob/orders/SellerPanelPage")) }),
] as const;
