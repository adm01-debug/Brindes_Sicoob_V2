import { lazyWithRetry } from "@/lib/lazyWithRetry";

export const toolRoutes = [
  { path: "/simulador", component: lazyWithRetry(() => import("@/pages/SimuladorWizard")) },
  { path: "/simulador-precos", component: lazyWithRetry(() => import("@/pages/PriceSimulatorPage")) },
  { path: "/estoque", component: lazyWithRetry(() => import("@/pages/StockDashboardPage")) },
  { path: "/busca-preco", component: lazyWithRetry(() => import("@/pages/AdvancedPriceSearchPage")) },
  { path: "/montar-kit", component: lazyWithRetry(() => import("@/pages/KitBuilderPage")) },
  { path: "/meus-kits", component: lazyWithRetry(() => import("@/pages/KitLibraryPage")) },
  { path: "/mockup-generator", component: lazyWithRetry(() => import("@/pages/MockupGenerator")) },
  { path: "/mockups/historico", component: lazyWithRetry(() => import("@/pages/MockupHistoryPage")) },
  { path: "/magic-up", component: lazyWithRetry(() => import("@/pages/MagicUp")) },
  { path: "/inteligencia-comercial", component: lazyWithRetry(() => import("@/pages/CommercialIntelligencePage")) },
  { path: "/ferramentas/bi", component: lazyWithRetry(() => import("@/pages/BusinessIntelligencePage")) },
  { path: "/ferramentas/bi/comparar", component: lazyWithRetry(() => import("@/pages/ClientComparatorPage")) },
  { path: "/match", component: lazyWithRetry(() => import("@/pages/ProductMatchPage")) },
  { path: "/dropbox", component: lazyWithRetry(() => import("@/pages/DropboxBrowserPage")) },
];
