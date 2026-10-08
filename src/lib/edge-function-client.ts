import { supabase } from "@/integrations/supabase/client";
import { getCircuitBreaker } from "./circuit-breaker";
import { logger } from "./logger";

/**
 * Utility for calling Supabase Edge Functions with a Circuit Breaker.
 * Prevents retry loops and protects the system during outages.
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  options: {
    body?: object;
    headers?: Record<string, string>;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
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
    });

    if (error) {
      logger.error(`Error calling edge function "${functionName}":`, error);
      throw error;
    }

    return data as T;
  });
}
