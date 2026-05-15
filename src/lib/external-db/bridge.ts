/**
 * External DB Bridge — Core invocation layer.
 * Re-routes to the high-performance implementation in invoke.ts.
 * Kept for backward compatibility.
 */
import { invokeWithRetry, type InvokeOptions, type InvokeResult } from './invoke';

export type Operation = 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'batch_insert';

export interface BridgeResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface BatchQuery {
  table: string;
  operation?: 'select';
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  cacheKey?: string;
}

export interface BatchResult {
  success: boolean;
  data?: { records: unknown[]; count: number | null };
  error?: string;
  fromCache?: boolean;
}

/**
 * Unified bridge call.
 */
export async function invokeBridge<T>(body: Record<string, unknown>): Promise<BridgeResponse<T>> {
  const { data, error } = await invokeWithRetry(body);
  if (error) {
    throw error;
  }
  return data as BridgeResponse<T>;
}

const BATCH_MAX_QUERIES = 10;

function extractBatchResults(payload: unknown): BatchResult[] {
  if (!payload || typeof payload !== 'object') return [];
  const directResults = (payload as { results?: BatchResult[] }).results;
  if (Array.isArray(directResults)) return directResults;
  const nestedResults = (payload as { data?: { results?: BatchResult[] } }).data?.results;
  if (Array.isArray(nestedResults)) return nestedResults;
  return [];
}

/**
 * Executes multiple queries in a single HTTP request.
 */
export async function invokeBatchBridge(queries: BatchQuery[]): Promise<BatchResult[]> {
  if (queries.length === 0) return [];
  
  const results: BatchResult[] = [];
  for (let i = 0; i < queries.length; i += BATCH_MAX_QUERIES) {
    const chunk = queries.slice(i, i + BATCH_MAX_QUERIES);
    const response = await invokeBridge<{ results: BatchResult[] }>({
      operation: 'batch',
      queries: chunk,
    });
    const parsedResults = extractBatchResults(response);
    results.push(...parsedResults);
  }
  return results;
}

/**
 * CRUD helper.
 */
export async function invokeExternalDb<T>(
  options: InvokeOptions
): Promise<InvokeResult<T>> {
  const response = await invokeBridge<InvokeResult<T> | T>(options as unknown as Record<string, unknown>);
  const payload = response.data;

  if (
    options.operation !== 'select' &&
    payload && typeof payload === 'object' &&
    !Array.isArray(payload) && !('records' in payload)
  ) {
    return { records: [payload as T], count: 1 };
  }
  return payload as InvokeResult<T>;
}

export async function invokeExternalDbSingle<T>(
  options: InvokeOptions
): Promise<T> {
  const result = await invokeExternalDb<T>(options);
  if (!result.records?.length) {
    throw new Error('Nenhum registro retornado');
  }
  return result.records[0];
}

export async function invokeExternalDbDelete(
  table: string,
  id: string
): Promise<void> {
  await invokeBridge<{ success: boolean; deleted_id: string }>({
    table,
    operation: 'delete',
    id,
  });
}
