import { lazyWithRetry } from "@/lib/lazyWithRetry";

export const quoteRoutes = [
  { path: "/orcamentos", component: lazyWithRetry(() => import("@/pages/QuotesListPage")) },
  { path: "/orcamentos/dashboard", component: lazyWithRetry(() => import("@/pages/QuotesDashboardPage")) },
  { path: "/orcamentos/lista", component: lazyWithRetry(() => import("@/pages/QuotesListPage")) },
  { path: "/orcamentos/kanban", component: lazyWithRetry(() => import("@/pages/QuotesKanbanPage")) },
  { path: "/orcamentos/templates", component: lazyWithRetry(() => import("@/pages/QuoteTemplatesPage")) },
  { path: "/orcamentos/novo", component: lazyWithRetry(() => import("@/pages/QuoteBuilderPage")) },
  { path: "/orcamentos/:id/editar", component: lazyWithRetry(() => import("@/pages/QuoteBuilderPage")) },
  { path: "/orcamentos/:id", component: lazyWithRetry(() => import("@/pages/QuoteViewPage")) },
];
