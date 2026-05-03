import { lazyWithRetry } from "@/lib/lazyWithRetry";

export const sicoobRoutes = [
  { path: "/admin/sicoob", component: lazyWithRetry(() => import("@/pages/admin/sicoob/SicoobManagementPage")) },
  { path: "/sicoob/pedidos", component: lazyWithRetry(() => import("@/pages/sicoob/orders/OrdersPage")) },
  { path: "/sicoob/pedidos/kanban", component: lazyWithRetry(() => import("@/pages/sicoob/orders/OrdersKanbanPage")) },
  { path: "/sicoob/pedidos/:id", component: lazyWithRetry(() => import("@/pages/sicoob/orders/OrderDetailPage")) },
  { path: "/sicoob/logistica", component: lazyWithRetry(() => import("@/pages/sicoob/LogisticsReportPage")) },
  { path: "/sicoob/vendas", component: lazyWithRetry(() => import("@/pages/sicoob/orders/SellerPanelPage")) },
];
