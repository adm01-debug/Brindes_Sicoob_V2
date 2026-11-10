#!/usr/bin/env node
/**
 * check-edge-functions-health — Verifica a saúde das Edge Functions
 * críticas do Supabase (alcançabilidade HTTP + latência).
 *
 * Por quê: uma Edge Function quebrada ou degradada derruba fluxos de
 * produção (aprovações, filas, recomendações) sem aviso. Este gate falha
 * o CI quando alguma função crítica não responde.
 *
 * Estratégia:
 *   1. Lê VITE_SUPABASE_URL e SUPABASE_ANON_KEY do ambiente.
 *   2. Dispara um GET em cada função da lista FUNCTIONS_TO_CHECK.
 *   3. Considera UP os status HTTP alcançáveis (200/401/403/405) — a
 *      função está viva mesmo que exija autenticação.
 *   4. Falha (exit 1) se houver função DOWN/DEGRADED; exit 2 em erro de
 *      configuração/execução; exit 0 se tudo operacional.
 *
 * Uso:
 *   node scripts/check-edge-functions-health.mjs            # local
 *   node scripts/check-edge-functions-health.mjs --timeout 15000
 *   (uso manual/operacional: nenhum workflow chama este script hoje)
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const C = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};
const isCI = process.env.CI === "true" || process.env.CI === "1";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "\x1b[31m❌ Variáveis de ambiente ausentes: VITE_SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias.\x1b[0m",
  );
  process.exit(2);
}

const FUNCTIONS_TO_CHECK = [
  "ai-recommendations",
  "sicoob-approval-notifications",
  "process-queue",
  "health-check",
];

const REACHABLE_HTTP_STATUSES = new Set([200, 401, 403, 405]);

// --timeout <ms>: limite por requisição (default 10s).
const timeoutIdx = process.argv.indexOf("--timeout");
const timeoutArg = process.argv.find((a) => a.startsWith("--timeout="));
const REQUEST_TIMEOUT_MS = timeoutArg
  ? Number(timeoutArg.split("=")[1])
  : timeoutIdx >= 0
    ? Number(process.argv[timeoutIdx + 1])
    : 10000;

if (!Number.isFinite(REQUEST_TIMEOUT_MS) || REQUEST_TIMEOUT_MS <= 0) {
  // `--timeout abc` virava NaN e as 4 funções caíam como DOWN com exit 1 (erro de uso é exit 2).
  console.error(`\x1b[31m❌ --timeout inválido: informe milissegundos > 0.\x1b[0m`);
  process.exit(2);
}

async function checkFunctions() {
  console.log("\x1b[1m═══ check-edge-functions-health ═══\x1b[0m");
  console.log("\x1b[2mSupabase:\x1b[0m " + supabaseUrl);
  console.log(
    "\x1b[2mFunções:\x1b[0m " + FUNCTIONS_TO_CHECK.length + "  \x1b[2m|\x1b[0m  " +
      "\x1b[2mTimeout:\x1b[0m " + REQUEST_TIMEOUT_MS + "ms",
  );

  const results = await Promise.all(
    FUNCTIONS_TO_CHECK.map(async (name) => {
      const start = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const resp = await fetch(supabaseUrl + "/functions/v1/" + name, {
          method: "GET",
          headers: { Authorization: "Bearer " + supabaseKey },
          signal: controller.signal,
        });
        const duration = Date.now() - start;
        return {
          name,
          status: REACHABLE_HTTP_STATUSES.has(resp.status) ? "UP" : "DEGRADED",
          latency: duration,
          httpStatus: resp.status,
        };
      } catch (e) {
        return {
          name,
          status: "DOWN",
          latency: Date.now() - start,
          error: e.name === "AbortError" ? "timeout" : e.message,
        };
      } finally {
        clearTimeout(timer);
      }
    }),
  );

  // Relatório em texto simples (console.table não é padrão CLI).
  for (const r of results) {
    const icon = r.status === "UP" ? "✅" : r.status === "DEGRADED" ? "⚠️" : "❌";
    const color = r.status === "UP" ? "\x1b[32m" : r.status === "DEGRADED" ? "\x1b[33m" : "\x1b[31m";
    const extra = r.error ? " (" + r.error + ")" : r.httpStatus ? " (HTTP " + r.httpStatus + ")" : "";
    console.log(
      color + icon + " " + r.name.padEnd(30) + " " + r.status.padEnd(8) + " " + r.latency + "ms" + extra + "\x1b[0m",
    );
  }

  const unhealthy = results.filter((r) => r.status !== "UP");
  if (unhealthy.length > 0) {
    console.error(
      "\n\x1b[31m🚨 " + unhealthy.length + " função(ões) indisponível(is) ou degradada(s):\x1b[0m",
    );
    for (const r of unhealthy) {
      const msg = r.name + " → " + r.status + (r.error ? " (" + r.error + ")" : " (HTTP " + r.httpStatus + ")");
      console.error("  \x1b[31m✗\x1b[0m " + msg);
      if (isCI) {
        console.log(
          "::error file=scripts/check-edge-functions-health.mjs,title=Edge Function " + r.name + " " + r.status + "::" + msg,
        );
      }
    }
    console.error(
      "\n\x1b[33m→ Solução:\x1b[0m verificar o deploy/logs da função no Supabase e o CORS/roteamento.\n",
    );
    process.exit(1);
  }

  console.log(
    "\n\x1b[32m✅ Todas as " + results.length + " Edge Functions críticas estão operacionais.\x1b[0m\n",
  );
  process.exit(0);
}

checkFunctions().catch((err) => {
  console.error("\x1b[31m❌ Falha inesperada no gate:\x1b[0m " + (err?.message ?? err));
  process.exit(2);
});