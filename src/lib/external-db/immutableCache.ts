/**
 * In-memory client cache for immutable-ish reference entities
 * (categories, suppliers, material_types) during a navigation session.
 * 
 * Performance Optimizations:
 * - Request Coalescing: concurrent requests for the same ID piggyback on a single promise.
 * - Selective Invalidation: allows clearing individual entities or groups.
 * - Zero-Latency Retrieval: synchronous access for already-fetched entities.
 */
import { invokeExternalDb } from './bridge';
import { logger } from '@/lib/logger';
import { diagnostics } from '@/lib/diagnostics';

type Entity = 'categories' | 'suppliers' | 'material_types';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes — refs change rarely
const INFLIGHT = new Map<string, Promise<unknown>>();
/**
 * Per-id in-flight tracking. Quando a chamada A pede [a,b,c] e antes dela
 * resolver chega B pedindo [b,c,d], B reaproveita as promises de b e c em
 * vez de disparar nova bridge — só `d` vai pra rede.
 */
const INFLIGHT_BY_ID: Record<Entity, Map<string, Promise<{ id: string; name: string; code?: string } | undefined>>> = {
  categories: new Map(),
  suppliers: new Map(),
  material_types: new Map(),
};
const STORE: Record<Entity, Map<string, CacheEntry<{ id: string; name: string; code?: string }>>> = {
  categories: new Map(),
  suppliers: new Map(),
  material_types: new Map(),
};

function now() { return Date.now(); }

function getFresh<T extends { id: string; name: string; code?: string }>(
  entity: Entity,
  id: string,
): T | undefined {
  const e = STORE[entity].get(id);
  if (!e) return undefined;
  if (e.expiresAt < now()) { STORE[entity].delete(id); return undefined; }
  return e.value as T;
}

function put(entity: Entity, rec: { id: string; name: string; code?: string }) {
  STORE[entity].set(rec.id, { value: rec, expiresAt: now() + TTL_MS });
}

const SELECT_BY_ENTITY: Record<Entity, string> = {
  categories: 'id, name',
  suppliers: 'id, name, code',
  material_types: 'id, name',
};

type ReferenceRecord = { id: string; name: string; code?: string };

function partitionIds<T extends ReferenceRecord>(
  entity: Entity,
  ids: string[],
  output: Map<string, T>,
): { missing: string[]; awaited: string[] } {
  const missing: string[] = [];
  const awaited: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const cached = getFresh<T>(entity, id);
    if (cached) output.set(id, cached);
    else if (INFLIGHT_BY_ID[entity].has(id)) awaited.push(id);
    else missing.push(id);
  }
  return { missing, awaited };
}

function piggybackRequests<T extends ReferenceRecord>(
  entity: Entity,
  awaited: string[],
  missing: string[],
  output: Map<string, T>,
): Promise<void>[] {
  const promises: Promise<void>[] = [];
  for (const id of awaited) {
    const pending = INFLIGHT_BY_ID[entity].get(id);
    if (!pending) {
      missing.push(id);
      continue;
    }
    promises.push(pending.then((record) => {
      if (record) output.set(id, record as T);
    }));
  }
  return promises;
}

async function fetchReferenceRecords<T extends ReferenceRecord>(
  entity: Entity,
  missing: string[],
): Promise<T[]> {
  const start = performance.now();
  const result = await invokeExternalDb<T>({
    table: entity,
    operation: 'select',
    select: SELECT_BY_ENTITY[entity],
    filters: { id: `in.(${missing.join(',')})` },
    limit: Math.max(missing.length, 50),
  });
  const duration = performance.now() - start;
  diagnostics.log('performance', 'immutableCache', `Fetched ${missing.length} ${entity}`, { duration, ids: missing });
  return result.records as T[];
}

function registerPerIdResolvers<T extends ReferenceRecord>(
  entity: Entity,
  missing: string[],
): Map<string, (record: T | undefined) => void> {
  const resolvers = new Map<string, (record: T | undefined) => void>();
  for (const id of missing) {
    const pending = new Promise<T | undefined>((resolve) => resolvers.set(id, resolve));
    INFLIGHT_BY_ID[entity].set(id, pending as Promise<ReferenceRecord | undefined>);
  }
  return resolvers;
}

function settlePerId<T extends ReferenceRecord>(
  entity: Entity,
  missing: string[],
  resolvers: Map<string, (record: T | undefined) => void>,
  records: T[],
): void {
  const byId = new Map(records.map((record) => [record.id, record]));
  for (const id of missing) {
    resolvers.get(id)?.(byId.get(id));
    INFLIGHT_BY_ID[entity].delete(id);
  }
}

async function loadMissingRecords<T extends ReferenceRecord>(
  entity: Entity,
  missing: string[],
): Promise<T[]> {
  const key = `${entity}:${[...missing].sort().join(',')}`;
  const existing = INFLIGHT.get(key) as Promise<T[]> | undefined;
  if (existing) return existing;

  const pending = fetchReferenceRecords<T>(entity, missing);
  INFLIGHT.set(key, pending as Promise<unknown>);
  const resolvers = registerPerIdResolvers<T>(entity, missing);
  try {
    const records = await pending;
    settlePerId(entity, missing, resolvers, records);
    return records;
  } catch (error) {
    logger.warn(`[immutableCache] fetch failed for ${entity}:`, error);
    settlePerId(entity, missing, resolvers, []);
    return [];
  } finally {
    INFLIGHT.delete(key);
  }
}

/**
 * Returns a Map<id, record> for the requested ids, fetching only the missing
 * ones in a single bridge call. De-duplicates concurrent requests via INFLIGHT.
 */
export async function getCachedByIds<T extends { id: string; name: string; code?: string }>(
  entity: Entity,
  ids: string[],
): Promise<Map<string, T>> {
  const out = new Map<string, T>();
  const { missing, awaited } = partitionIds(entity, ids, out);
  const piggybackPromises = piggybackRequests(entity, awaited, missing, out);

  if (missing.length === 0) {
    if (piggybackPromises.length) await Promise.all(piggybackPromises);
    return out;
  }

  const records = await loadMissingRecords<T>(entity, missing);

  for (const rec of records) {
    if (rec?.id) {
      put(entity, rec);
      out.set(rec.id, rec);
    }
  }

  if (piggybackPromises.length) await Promise.all(piggybackPromises);
  return out;
}

/** Convenience for a single id. */
export async function getCachedById<T extends { id: string; name: string; code?: string }>(
  entity: Entity,
  id: string,
): Promise<T | undefined> {
  const map = await getCachedByIds<T>(entity, [id]);
  return map.get(id);
}

/** Manual invalidation (useful after admin edits). */
export function invalidateImmutableCache(entity?: Entity) {
  if (entity) STORE[entity].clear();
  else { STORE.categories.clear(); STORE.suppliers.clear(); STORE.material_types.clear(); }
}

/** Synchronous cache peek (no fetch). Returns undefined if missing or stale. */
export function getFreshFromCacheSafe<T extends { id: string; name: string; code?: string }>(
  entity: Entity, id: string,
): T | undefined {
  return getFresh<T>(entity, id);
}

/** Synchronous cache write (used after a successful bridge fetch). */
export function putInCacheSafe(
  entity: Entity, rec: { id: string; name: string; code?: string },
) {
  if (rec?.id && rec?.name) put(entity, rec);
}

/** Debug snapshot. */
export function immutableCacheStats() {
  return {
    categories: STORE.categories.size,
    suppliers: STORE.suppliers.size,
    material_types: STORE.material_types.size,
  };
}
