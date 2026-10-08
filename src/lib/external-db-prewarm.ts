/**
 * Pre-warming do banco externo para evitar cold starts.
 *
 * Estratégia (pós-otimização):
 *  1. Um ping leve (sem I/O de BD) acorda a edge function — completa em ~80ms quando
 *     ela já está quente via cron keep-alive (job `external-db-bridge-keepalive`).
 *  2. Em seguida, dispara todas as tabelas EM PARALELO (Promise.allSettled),
 *     reusando a mesma conexão já aberta no pool. Reduz o tempo total de ~5s
 *     (sequencial 800ms × 6) para ~1.5s no pior caso.
 *
 * Cooldown de 5 min impede thrashing entre navegações.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { waitForBridgeReady } from '@/lib/external-db/health-check';

const PREWARM_TABLES = [
  'products',
  'product_images',
  'product_variants',
  'categories',
  'suppliers',
  'color_groups',
];

let lastPrewarmAt = 0;
const PREWARM_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos entre pre-warms
const SESSION_KEY = '__pg_prewarm_done__';

/**
 * Acorda o crm-db-bridge em paralelo (cold start ~80–250ms).
 * Mesma estratégia: ping leve via OPTIONS, falha silenciosa.
 */
async function pingCrmBridge(): Promise<{ ok: boolean; ms: number }> {
  const t0 = performance.now();
  try {
    // Use lightweight ?op=ping — does NOT touch CRM credentials, so it
    // succeeds even when EXTERNAL_CRM_URL/KEY are placeholders. Avoids
    // the "CRM connection is not configured correctly" 500 that was
    // surfacing as a white screen on login.
    await supabase.functions.invoke('crm-db-bridge', {
      body: { operation: 'ping' },
    }).catch(() => undefined);
    return { ok: true, ms: Math.round(performance.now() - t0) };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - t0) };
  }
}

/**
 * Acorda a edge function via health-check compartilhado (`waitForBridgeReady`).
 * O helper já faz polling com backoff e cacheia "ready" — então UI e prewarm
 * convergem na mesma promise quando rodam próximos no tempo.
 */
async function pingBridge(): Promise<{ ok: boolean; ms: number; attempts: number }> {
  const t0 = performance.now();
  const res = await waitForBridgeReady(5000);
  return {
    ok: res.ok,
    ms: res.ms || Math.round(performance.now() - t0),
    attempts: 1,
  };
}

/**
 * Coalesce as 6 tabelas em UMA única chamada `operation: 'batch'`.
 *
 * Antes: 6 invokes paralelos = 6 round-trips TLS, 6 entradas no rate-limit,
 * 6 fan-outs no PostgREST. Mesmo com singleton + warm-up, cada request paga
 * o overhead de Cloudflare → Supabase Edge → bridge handler.
 *
 * Depois: 1 invoke. A bridge expande o batch em `Promise.all` interno
 * (handleBatch, supabase/functions/external-db-bridge/index.ts:499) reusando
 * o mesmo client cacheado. Resultado: ~1.5s → ~250ms no warm path.
 */
async function warmAllTables(tables: string[]): Promise<Array<{ table: string; ok: boolean; ms: number; err?: string }>> {
  const t0 = performance.now();
  try {
    const { data, error } = await supabase.functions.invoke('external-db-bridge', {
      body: {
        operation: 'batch',
        queries: tables.map((table) => ({
          table,
          select: 'id',
          limit: 1,
          countMode: 'none',
        })),
      },
    });
    const totalMs = Math.round(performance.now() - t0);
    if (error) {
      // Falha global do batch — reporta como falha em todas as tabelas
      return tables.map((table) => ({ table, ok: false, ms: totalMs, err: error.message }));
    }
    // handleBatch retorna { results: [{ success, data?, error? }, ...] }
    const results = (data?.results ?? []) as Array<{ success: boolean; error?: string }>;
    return tables.map((table, idx) => {
      const r = results[idx];
      if (!r) return { table, ok: false, ms: totalMs, err: 'missing batch slot' };
      return { table, ok: !!r.success, ms: totalMs, err: r.success ? undefined : r.error };
    });
  } catch (err) {
    const totalMs = Math.round(performance.now() - t0);
    return tables.map((table) => ({ table, ok: false, ms: totalMs, err: (err as Error)?.message }));
  }
}

function alreadyPrewarmedThisSession(force: boolean, oncePerSession: boolean): boolean {
  if (force || !oncePerSession) return false;
  try {
    const alreadyDone = sessionStorage.getItem(SESSION_KEY) === '1';
    if (alreadyDone) logger.log('[Prewarm] Skipped — already done this session');
    return alreadyDone;
  } catch {
    return false;
  }
}

function cooldownIsActive(force: boolean, timestamp: number): boolean {
  if (force || timestamp - lastPrewarmAt >= PREWARM_COOLDOWN_MS) return false;
  logger.log('[Prewarm] Skipped — cooldown active');
  return true;
}

function summarizeBatch(
  result: PromiseSettledResult<Array<{ table: string; ok: boolean; ms: number; err?: string }>>,
): { okCount: number; failCount: number } {
  if (result.status === 'rejected') {
    logger.warn(`[Prewarm] ⚠️ batch rejected:`, result.reason);
    return { okCount: 0, failCount: PREWARM_TABLES.length };
  }
  let okCount = 0;
  let failCount = 0;
  for (const tableResult of result.value) {
    if (tableResult.ok) {
      okCount += 1;
      logger.log(`[Prewarm] ✅ ${tableResult.table} warmed (batch ${tableResult.ms}ms)`);
    } else {
      failCount += 1;
      logger.warn(`[Prewarm] ⚠️ ${tableResult.table} failed: ${tableResult.err}`);
    }
  }
  return { okCount, failCount };
}

function crmSummary(result: PromiseSettledResult<{ ok: boolean; ms: number }>): string {
  if (result.status === 'rejected') return 'crm=⚠️ rejected';
  return `crm=${result.value.ok ? '✅' : '⚠️'} (${result.value.ms}ms)`;
}

function markSessionPrewarmed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // sessionStorage indisponível (SSR/private mode)
  }
}

/**
 * Opções do prewarm.
 *  - `force`: ignora cooldown E sessionStorage (uso interno/debug)
 *  - `oncePerSession`: respeita flag em sessionStorage (default true). Quando true,
 *    o prewarm dispara no máximo 1x por sessão de browser — ideal para gatilho
 *    no login. Outros call-sites (ex.: navegação) devem passar `false`.
 */
export async function prewarmExternalDb(opts: { force?: boolean; oncePerSession?: boolean } = {}) {
  const { force = false, oncePerSession = false } = opts;

  if (alreadyPrewarmedThisSession(force, oncePerSession)) return;

  const now = Date.now();
  if (cooldownIsActive(force, now)) return;
  lastPrewarmAt = now;

  const totalStart = performance.now();
  logger.log('[Prewarm] Warming up external DB connections (parallel)...');

  // 1) Acorda a edge function com um ping leve (sem BD). Aguardamos
  //    explicitamente até receber 200 — só então liberamos o leque paralelo.
  const ping = await pingBridge();

  if (!ping.ok) {
    // Isolate não respondeu nem após 3 tentativas. Disparar 6 chamadas paralelas
    // agora só amplificaria o problema — aborta e libera o cooldown para um
    // novo prewarm na próxima navegação.
    lastPrewarmAt = 0;
    const totalMs = Math.round(performance.now() - totalStart);
    logger.warn(
      `[Prewarm] ⛔ Aborted — bridge ping failed after ${ping.attempts} attempts in ${ping.ms}ms (total ${totalMs}ms). Skipping parallel fan-out.`,
    );
    return;
  }

  // 2) Isolate confirmadamente quente — dispara batch único + crm-bridge EM PARALELO
  //    (apenas 2 invokes totais: 1 batch das 6 tabelas + 1 ping CRM)
  const [crmPing, batchResult] = await Promise.allSettled([
    pingCrmBridge(),
    warmAllTables(PREWARM_TABLES),
  ]);

  const totalMs = Math.round(performance.now() - totalStart);
  const { okCount, failCount } = summarizeBatch(batchResult);
  const crmInfo = crmSummary(crmPing);

  // Marca a sessão como aquecida — evita prewarm duplicado se outro gatilho disparar
  markSessionPrewarmed();

  logger.log(
    `[Prewarm] Done in ${totalMs}ms — ping=${ping.ms}ms (${ping.attempts}x) ${crmInfo} external_ok=${okCount} fail=${failCount} (1 batch invoke)`,
  );
}


/**
 * Limpa o flag de sessão. Útil em logout para garantir prewarm no próximo login.
 */
export function resetPrewarmSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  lastPrewarmAt = 0;
}
