/**
 * Sondador unificado de status da plataforma Lovable Cloud.
 *
 * Combina 3 sinais para inferir um estado normalizado:
 *   1. `auth.getSession()`     → API de auth respondendo
 *   2. `pingHealth()`          → bridge externo (edge function) viva
 *   3. HEAD em `/rest/v1/`     → Postgres/PostgREST acessível
 *
 * Estados:
 *   - `healthy`   3/3 OK e latências < 2s
 *   - `warming`   2/3 OK ou 3/3 com latência alta
 *   - `degraded`  1/3 OK
 *   - `down`      0/3 OK
 *
 * Características:
 *   - Cache de 15s (resultado é compartilhado entre chamadas próximas).
 *   - Coalescing de chamadas paralelas (1 sondagem por vez).
 *   - EventTarget para broadcast — UI escuta via `onCloudStatusChange()`.
 */
import { supabase, supabasePublishableKey, supabaseUrl } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { pingHealth } from '@/lib/external-db/health-check';
import { getRequestHeaders } from '@/lib/system/request-context'; // Novo utilitário para propagar X-Request-Id

export type CloudStatus = 'healthy' | 'warming' | 'degraded' | 'down' | 'unknown';

export interface CloudStatusSnapshot {
  status: CloudStatus;
  signals: {
    auth: { ok: boolean; ms: number };
    bridge: { ok: boolean; ms: number };
    rest: { ok: boolean; ms: number };
  };
  checkedAt: number;
}

const CACHE_MS = 15_000;
const HIGH_LATENCY_MS = 2000;

let cached: CloudStatusSnapshot | null = null;
let inFlight: Promise<CloudStatusSnapshot> | null = null;

const target: EventTarget = typeof EventTarget !== 'undefined' ? new EventTarget() : ({
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
} as unknown as EventTarget);

const EVENT_NAME = 'cloud-status-change';

export class CloudNotReadyError extends Error {
  readonly code = 'CLOUD_NOT_READY' as const;
  readonly status: CloudStatus;
  constructor(status: CloudStatus, message?: string) {
    super(message ?? `Lovable Cloud not ready (status=${status})`);
    this.name = 'CloudNotReadyError';
    this.status = status;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

async function checkAuth(): Promise<{ ok: boolean; ms: number }> {
  const t0 = performance.now();
  try {
    const { error } = await withTimeout(supabase.auth.getSession(), 2500);
    return { ok: !error, ms: Math.round(performance.now() - t0) };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - t0) };
  }
}

async function checkRest(): Promise<{ ok: boolean; ms: number }> {
  const t0 = performance.now();
  const url = supabaseUrl;
  const key = supabasePublishableKey;
  if (!url || !key) return { ok: false, ms: 0 };
  try {
    const headers = getRequestHeaders({ 
      apikey: key, 
      Authorization: `Bearer ${key}` 
    });
    const res = await withTimeout(
      fetch(`${url}/rest/v1/`, {
        method: 'HEAD',
        headers,
      }),
      2500,
    );
    return { ok: res.ok || res.status === 404, ms: Math.round(performance.now() - t0) };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - t0) };
  }
}

async function checkHealthFunction(): Promise<{ ok: boolean; ms: number; data?: unknown }> {
  const t0 = performance.now();
  try {
    const headers = getRequestHeaders();
    const { data, error } = await supabase.functions.invoke('system-healthcheck', {
      headers,
    });
    const ms = Math.round(performance.now() - t0);
    return { ok: !error, ms, data };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - t0) };
  }
}

function healthFunctionStatus(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || !('status' in data)) return undefined;
  return typeof data.status === 'string' ? data.status : undefined;
}

function deriveStatus(signals: CloudStatusSnapshot['signals']): CloudStatus {
  const okCount = [signals.auth.ok, signals.bridge.ok, signals.rest.ok].filter(Boolean).length;
  const slow = [signals.auth.ms, signals.bridge.ms, signals.rest.ms].some((m) => m > HIGH_LATENCY_MS);
  if (okCount === 3) return slow ? 'warming' : 'healthy';
  if (okCount === 2) return 'warming';
  if (okCount === 1) return 'degraded';
  return 'down';
}

/**
 * Executa a sondagem (ou retorna cache válido).
 */
export async function probeCloudStatus(force = false): Promise<CloudStatusSnapshot> {
  if (!force && cached && Date.now() - cached.checkedAt < CACHE_MS) {
    return cached;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const [auth, bridgeRes, rest, healthFn] = await Promise.all([
      checkAuth(),
      pingHealth(2500).then((r) => ({ ok: r.ok, ms: r.ms })),
      checkRest(),
      checkHealthFunction(),
    ]);

    // O status do healthFn (que checa banco e bridges internas) tem precedência
    const signals = { auth, bridge: bridgeRes, rest };
    let status = deriveStatus(signals);

    // Se a function de health reportar erro crítico, refletimos isso
    const healthStatus = healthFunctionStatus(healthFn.data);
    if (healthFn.ok && healthStatus === 'down') status = 'down';
    if (healthFn.ok && healthStatus === 'degraded' && status === 'healthy') status = 'warming';

    const snapshot: CloudStatusSnapshot = {
      status,
      signals,
      checkedAt: Date.now(),
    };
    const previous = cached?.status;
    cached = snapshot;
    if (previous !== snapshot.status) {
      logger.warn(`[CloudStatus] state change ${previous ?? 'unknown'} → ${snapshot.status}`, { ...signals, healthFn: healthFn.data });
      target.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: snapshot }));
    }
    return snapshot;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function getCachedCloudStatus(): CloudStatusSnapshot | null {
  return cached;
}

export function onCloudStatusChange(
  cb: (snapshot: CloudStatusSnapshot) => void,
): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<CloudStatusSnapshot>).detail);
  target.addEventListener(EVENT_NAME, handler);
  return () => target.removeEventListener(EVENT_NAME, handler);
}

export function invalidateCloudStatus(): void {
  cached = null;
}

/**
 * Gate: aguarda o Cloud ficar `healthy` (ou `warming`) antes de prosseguir.
 * Rejeita com `CloudNotReadyError` se persistir `degraded`/`down` após o orçamento.
 *
 * @param totalTimeoutMs orçamento total (default 8s)
 * @param acceptWarming se true, considera `warming` como pronto (default true — não bloqueia UX em cold start de isolate)
 */
export async function ensureCloudReady(
  totalTimeoutMs = 8000,
  acceptWarming = true,
): Promise<CloudStatusSnapshot> {
  const start = performance.now();
  let attempt = 0;
  let snap = await probeCloudStatus(false);

  const isReady = (s: CloudStatus) =>
    s === 'healthy' || (acceptWarming && s === 'warming');

  while (!isReady(snap.status) && performance.now() - start < totalTimeoutMs) {
    attempt++;
    const delay = Math.min(1500, 200 * Math.pow(2, attempt - 1));
    if (performance.now() - start + delay >= totalTimeoutMs) break;
    await new Promise((r) => setTimeout(r, delay));
    snap = await probeCloudStatus(true);
  }

  if (!isReady(snap.status)) {
    throw new CloudNotReadyError(snap.status);
  }
  return snap;
}
