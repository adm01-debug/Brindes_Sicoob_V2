// Core Infrastructure
export { supabase } from "@/integrations/supabase/client";
export { logger } from "./logger";
export { diagnostics } from "./diagnostics";

// Formatting
export * from "./format";
export * from "./date-utils";
export * from "./textUtils";

// Auth & Security
export * from "./auth/auth-utils";
export * from "./roles";
export { CircuitBreaker } from "./circuit-breaker";

// Communication
export { invokeEdgeFunction } from "./edge-function-client";
export { invokeExternalRpc } from "./external-rpc";

// Validation
export * from "./validations";

// Routing & Performance
export { lazyWithRetry } from "./lazyWithRetry";
export * from "./router-utils";
export { prefetchRoute, getPrefetchHandlers } from "./routePrefetch";

// Domain Helpers
export * from "./order-status-config";
export * from "./quote-status-config";
export * from "./sicoob-status-config";
export * from "./variant-matching";
export * from "./stock-chart-utils";

// Utilities
export { cn } from "./utils";
