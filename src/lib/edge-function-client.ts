import { supabase } from "@/integrations/supabase/client";
import { getCircuitBreaker } from "./circuit-breaker";
import { logger } from "./logger";

/**
 * Utility for calling Supabase Edge Functions with a Circuit Breaker.
 * Prevents retry loops and protects the system during outages.
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  options: {
    body?: any;
    headers?: Record<string, string>;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    query_params?: Record<string, string>;
  } = {}
): Promise<T> {
  const breaker = getCircuitBreaker(`edge-function-${functionName}`, {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
  });

  return breaker.execute(async () => {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: options.body,
      headers: options.headers,
      method: options.method,
      queryParams: options.query_params,
    });

    if (error) {
      logger.error(`Error calling edge function "${functionName}":`, error);
      throw error;
    }

    return data as T;
  });
}
